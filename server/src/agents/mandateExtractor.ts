export interface ExtractedMandateRules {
  budgetCents?: number;
  size?: string;
  attributes: string[];
  category?: string;
  merchantDeny: string[];
}

const COLORS = [
  "red", "blue", "black", "white", "green", "grey", "gray", "yellow", "pink",
  "purple", "orange", "brown", "navy", "beige"
];
const RESALE_MERCHANTS = ["ReSole Outlet"];
const MONEY = "(\\d+(?:\\.\\d{1,2})?)";
const BUDGET_PATTERN = new RegExp(
  `(?:\\b(?:under|below|less than|within|up to|max|maximum|at most|not more than|budget\\s+of)\\s*\\$?\\s*${MONEY}(?:\\s*(?:dollars?|usd|bucks|or\\s+less))?\\b|\\$${MONEY}(?:\\s*(?:dollars?|usd|bucks))?\\b|\\b${MONEY}\\s*(?:dollars?|usd|bucks)\\b|\\b${MONEY}\\s+or\\s+less\\b)`,
  "gi"
);
const SIZE_VALUE = "(?:(?:UK|US|EU)\\s*)?(?:\\d+(?:\\.\\d+)?|XXL|XL|XS|S|M|L|medium|large)";

const moneyToCents = (value: string): number | undefined => {
  const [whole, fraction = ""] = value.split(".");
  if (whole === undefined) return undefined;
  const dollars = Number.parseInt(whole, 10);
  if (!Number.isInteger(dollars) || dollars < 0) return undefined;
  const centsText = `${fraction}00`.slice(0, 2);
  const cents = Number.parseInt(centsText, 10);
  return dollars * 100 + cents;
};

const normalizeSize = (value: string): string => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.toLowerCase() === "medium") return "M";
  if (normalized.toLowerCase() === "large") return "L";
  return normalized.replace(/^(uk|us|eu)\b/i, (prefix) => prefix.toUpperCase());
};

const extractBudget = (text: string): number | undefined => {
  const match = BUDGET_PATTERN.exec(text);
  BUDGET_PATTERN.lastIndex = 0;
  if (!match) return undefined;
  const amount = match.slice(1).find((value) => value !== undefined);
  return amount ? moneyToCents(amount) : undefined;
};

const extractSize = (text: string): string | undefined => {
  const prefixMatch = text.match(new RegExp(`\\b((?:UK|US|EU)\\s*\\d+(?:\\.\\d+)?)\\b`, "i"));
  const namedMatch = text.match(new RegExp(
    `(?:\\(?\\b(?:in\\s+)?(?:size|sz)(?:\\s+(?:should\\s+be|is))?\\s*:?\\s*)(${SIZE_VALUE})\\)?`,
    "i"
  ));
  const suffixMatch = text.match(new RegExp(`\\b(${SIZE_VALUE})\\s+size\\b`, "i"));
  const value = prefixMatch?.[1] ?? namedMatch?.[1] ?? suffixMatch?.[1];
  return value ? normalizeSize(value) : undefined;
};

const extractMerchantDeny = (text: string): string[] => {
  const denied: string[] = [];
  const patterns = [
    /\bnot\s+from\s+([^,.!;]+)/gi,
    /\bavoid\s+([^,.!;]+)/gi,
    /\bexcept\s+([^,.!;]+)/gi,
    /\bwithout\s+([^,.!;]+)/gi
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const merchant = match[1]?.trim();
      if (merchant) {
        if (/\bresale\b/i.test(merchant)) {
          denied.push(...RESALE_MERCHANTS);
        } else {
          denied.push(merchant);
        }
      }
    }
  }

  if (/\bno\s+resale(?:\s+(?:sites?|shops?|stores?|marketplaces?))?\b/i.test(text)) {
    denied.push(...RESALE_MERCHANTS);
  }

  return Array.from(new Set(denied));
};

const deriveCategory = (text: string): string | undefined => {
  const withoutConstraints = text
    .replace(BUDGET_PATTERN, " ")
    .replace(new RegExp(`\\(?\\b(?:in\\s+)?(?:size|sz)(?:\\s+(?:should\\s+be|is))?\\s*:?\\s*${SIZE_VALUE}\\)?`, "gi"), " ")
    .replace(/\b(?:UK|US|EU)\s*\d+(?:\.\d+)?\b/gi, " ")
    .replace(new RegExp(`\\b${SIZE_VALUE}\\s+size\\b`, "gi"), " ")
    .replace(/\b(?:not\s+from|avoid|except|without)\s+[^,.!;]+|\bno\s+resale(?:\s+(?:sites?|shops?|stores?|marketplaces?))?\b/gi, " ");
  BUDGET_PATTERN.lastIndex = 0;

  const withoutColors = COLORS.reduce((value, color) => {
    return value.replace(new RegExp(`\\b${color}\\b`, "gi"), " ");
  }, withoutConstraints);
  const category = withoutColors
    .replace(/\b(?:buy|get|find|purchase|i want|need|for me|please|a|an|the|and|with|in|me|for|dollars?|bucks?|usd)\b/gi, " ")
    .replace(/[,.;:!()?"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return category || undefined;
};

export const extractMandateRules = (text: string): ExtractedMandateRules => {
  const attributes = COLORS.filter((color) => new RegExp(`\\b${color}\\b`, "i").test(text));
  const budgetCents = extractBudget(text);
  const size = extractSize(text);
  const category = deriveCategory(text);

  return {
    ...(budgetCents === undefined ? {} : { budgetCents }),
    ...(size === undefined ? {} : { size }),
    attributes,
    ...(category === undefined ? {} : { category }),
    merchantDeny: extractMerchantDeny(text)
  };
};
