import type { LLMPort } from "../ports/llm.port.js";
import type { MandateConstraints, ParseMandateResponse } from "@agentledger/shared";
import { MandateConstraintsSchema, ParseMandateResponseSchema } from "@agentledger/shared";
import { env } from "../config/env.js";
import { logger } from "../observability/logger.js";
import { extractMandateRules } from "./mandateExtractor.js";

type ParsedBy = "gemini" | "rules" | "mock";

type ParsedMandateResponse = ParseMandateResponse & {
  parsedBy: ParsedBy;
  overridden: boolean;
};

const SYSTEM_INSTRUCTION = `You are the AgentLedger Mandate Parser.
Return a JSON object with readback and constraints.
Use only details stated in the user's request. Do not invent category, size, color,
merchant, or expiry values. Leave any unstated optional fields empty.`;

const extractExpiry = (text: string): { expiresAt: string; expiryStated: boolean } => {
  const now = new Date();
  const duration = text.match(/\b(?:for|within|in)\s+(\d+)\s+(days?|weeks?)\b/i);
  if (duration) {
    const [, amountText, unitText] = duration;
    if (amountText !== undefined && unitText !== undefined) {
      const amount = Number.parseInt(amountText, 10);
      const days = unitText.toLowerCase().startsWith("week") ? amount * 7 : amount;
      return { expiresAt: new Date(now.getTime() + days * 86400000).toISOString(), expiryStated: true };
    }
  }

  const dateText = text.match(
    /\b\d{4}-\d{2}-\d{2}\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b/i
  )?.[0];
  if (dateText) {
    const hasYear = /\d{4}/.test(dateText);
    const parsed = new Date(hasYear ? dateText : `${dateText}, ${now.getUTCFullYear()}`);
    if (!Number.isNaN(parsed.getTime())) {
      if (!hasYear && parsed.getTime() < now.getTime()) parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
      return { expiresAt: parsed.toISOString(), expiryStated: true };
    }
  }

  return { expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(), expiryStated: false };
};

const appearsInUserText = (value: string, userPrompt: string): boolean => {
  return userPrompt.toLowerCase().includes(value.toLowerCase());
};

const formatExpiry = (expiresAt: string): string => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
}).format(new Date(expiresAt));

const buildReadback = (constraints: MandateConstraints): string => {
  const isPlural = constraints.itemCategory.toLowerCase().endsWith("s");
  const prefix = isPlural ? "" : "a ";
  const itemDescription = [
    ...constraints.attributes,
    constraints.itemCategory
  ].join(" ");
  const segments = [
    `The agent may spend up to $${(constraints.budgetAmountCents / 100).toFixed(2)} on ${prefix}${itemDescription}`,
    constraints.size ? `size ${constraints.size}` : "",
    constraints.merchantAllow.length > 0 ? `only from ${constraints.merchantAllow.join(", ")}` : "",
    constraints.merchantDeny.length > 0 ? `never from ${constraints.merchantDeny.join(", ")}` : ""
  ].filter(Boolean);

  return `${segments.join(", ")}, until ${formatExpiry(constraints.expiresAt ?? new Date().toISOString())}.`;
};

const getRawModelResponse = (err: unknown): string => {
  if (err && typeof err === "object" && "rawModelResponse" in err) {
    const rawModelResponse = err.rawModelResponse;
    if (typeof rawModelResponse === "string") return rawModelResponse.slice(0, 300);
  }
  return "";
};

const createRulesOnlyResponse = (
  userPrompt: string,
  expiresAt: string
): ParsedMandateResponse => {
  const rules = extractMandateRules(userPrompt);
  if (rules.budgetCents === undefined || rules.category === undefined) {
    throw new Error("Could not understand the request");
  }
  const constraints = MandateConstraintsSchema.parse({
    budgetAmountCents: rules.budgetCents,
    currency: "USD",
    itemCategory: rules.category,
    size: rules.size,
    attributes: rules.attributes,
    merchantAllow: [],
    merchantDeny: rules.merchantDeny,
    expiresAt
  });

  return { readback: buildReadback(constraints), constraints, parsedBy: "rules", overridden: true };
};

export const parseMandateRequest = async (
  llm: LLMPort,
  userPrompt: string
): Promise<ParsedMandateResponse> => {
  const rules = extractMandateRules(userPrompt);
  const expiry = extractExpiry(userPrompt);
  const prompt = `Parse this shopping request into the documented JSON structure.
User request: "${userPrompt}"`;

  try {
    const parsed = await llm.generateStructured(prompt, ParseMandateResponseSchema, SYSTEM_INSTRUCTION);
    const attributes = rules.attributes.length > 0
      ? rules.attributes
      : (parsed.constraints.attributes ?? []).filter((attribute) => appearsInUserText(attribute, userPrompt));
    const size = rules.size ?? (
      parsed.constraints.size && appearsInUserText(parsed.constraints.size, userPrompt)
        ? parsed.constraints.size
        : undefined
    );
    const merchantAllow = (parsed.constraints.merchantAllow ?? []).filter((merchant) => {
      return appearsInUserText(merchant, userPrompt);
    });
    const merchantDeny = rules.merchantDeny.length > 0
      ? rules.merchantDeny
      : (parsed.constraints.merchantDeny ?? []).filter((merchant) => appearsInUserText(merchant, userPrompt));
    const itemCategory = rules.category ?? (
      parsed.constraints.itemCategory && appearsInUserText(parsed.constraints.itemCategory, userPrompt)
        ? parsed.constraints.itemCategory
        : undefined
    );
    if (!itemCategory) {
      throw new Error("Could not understand the request");
    }
    const budgetAmountCents = rules.budgetCents ?? (
      parsed.constraints.budgetAmountCents > 0 ? parsed.constraints.budgetAmountCents : undefined
    );
    if (!budgetAmountCents || budgetAmountCents <= 0) {
      throw new Error("Could not understand the request");
    }

    const overridden = rules.budgetCents !== undefined || rules.size !== undefined
      || rules.attributes.length > 0 || rules.merchantDeny.length > 0 || expiry.expiryStated
      || rules.category !== parsed.constraints.itemCategory;
    const constraints = MandateConstraintsSchema.parse({
      ...parsed.constraints,
      budgetAmountCents,
      itemCategory,
      size,
      currency: "USD",
      attributes,
      merchantAllow,
      merchantDeny,
      expiresAt: expiry.expiresAt
    });

    return {
      readback: buildReadback(constraints),
      constraints,
      parsedBy: env.LLM_PROVIDER === "mock" ? "mock" : "gemini",
      overridden
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown parser error";
    logger.warn({ reason, rawModelResponse: getRawModelResponse(err) }, "Mandate parsing failed; applying deterministic rules");
    if (rules.budgetCents !== undefined && rules.category !== undefined) {
      return createRulesOnlyResponse(userPrompt, expiry.expiresAt);
    }
    throw new Error("Could not understand the request");
  }
};
