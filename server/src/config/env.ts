import { z } from "zod";

// Preserve existing process.env variables so test/CLI values win over .env file
const initialEnv = { ...process.env };

try {
  const dotenv = await import("dotenv");
  dotenv.config({ override: false });
} catch {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile();
    }
  } catch {
    // Ignore if .env file does not exist yet (defaults will apply)
  }
}

// Guarantee that variables originally present in process.env are never overridden
for (const [key, value] of Object.entries(initialEnv)) {
  if (value !== undefined) {
    process.env[key] = value;
  }
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("localhost"),
  PAYPAL_CLIENT_ID: z.string().default("mock_client_id"),
  PAYPAL_CLIENT_SECRET: z.string().default("mock_client_secret"),
  PAYPAL_BASE_URL: z.string().url().refine((url) => {
    return url === "https://api-m.sandbox.paypal.com";
  }, {
    message: "Refusing live PayPal URL. Must be https://api-m.sandbox.paypal.com"
  }).default("https://api-m.sandbox.paypal.com"),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MODE: z.enum(["sandbox", "mock"]).default("mock"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.6-flash"),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.2"),
  LLM_PROVIDER: z.enum(["gemini", "ollama", "mock"]).default("mock"),
  CATALOG_PROVIDER: z.enum(["mock", "dummyjson"]).default("mock"),
  DISPUTE_MODE: z.enum(["simulated", "sandbox"]).default("simulated"),
  USE_AGENT_TOOLKIT: z.enum(["true", "false"]).transform((v) => v === "true").default("false"),
  DATABASE_PATH: z.string().default("data/agentledger.db"),
  KEYS_DIR: z.string().default("data/keys")
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);

export const getPublicConfig = (): {
  paypalMode: Env["PAYPAL_MODE"];
  paypalClientId: string;
  catalogProvider: Env["CATALOG_PROVIDER"];
  llmProvider: Env["LLM_PROVIDER"];
  disputeMode: Env["DISPUTE_MODE"];
} => ({
  paypalMode: env.PAYPAL_MODE,
  paypalClientId: env.PAYPAL_CLIENT_ID,
  catalogProvider: env.CATALOG_PROVIDER,
  llmProvider: env.LLM_PROVIDER,
  disputeMode: env.DISPUTE_MODE
});

export const getPublicPayPalConfig = (): {
  paypalMode: Env["PAYPAL_MODE"];
  paypalClientId: string;
} => ({
  paypalMode: env.PAYPAL_MODE,
  paypalClientId: env.PAYPAL_CLIENT_ID
});
