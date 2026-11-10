import type { LLMPort } from "../ports/llm.port.js";
import type { ParseMandateResponse } from "@agentledger/shared";
import { ParseMandateResponseSchema } from "@agentledger/shared";

const SYSTEM_INSTRUCTION = `You are the AgentLedger Mandate Parser.
Extract user purchasing intent into a strict spending mandate.
Requirements:
1. budgetAmountCents: Integer cents only (e.g. $120 is 12000).
2. itemCategory: Primary product category requested.
3. size: String if size was mentioned (e.g. "10").
4. attributes: Array of specific descriptors (e.g. ["white"]).
5. merchantAllow: Array of allowed merchants, or empty array if not restricted.
6. merchantDeny: Array of prohibited merchants (e.g. ["ReSole Outlet"] if "no resale" requested).
7. readback: Clear, precise plain-English summary of what the agent is authorized to do.`;

export const parseMandateRequest = async (
  llm: LLMPort,
  userPrompt: string
): Promise<ParseMandateResponse> => {
  const prompt = `Parse the following shopping request into a spending mandate:
User Request: "${userPrompt}"

Current Date: ${new Date().toISOString()}
Return a JSON object conforming to the required schema with 'readback' and 'constraints'.`;

  return (await llm.generateStructured(
    prompt,
    ParseMandateResponseSchema,
    SYSTEM_INSTRUCTION
  )) as ParseMandateResponse;
};
