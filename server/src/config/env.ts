import { z } from "zod";

// Attempt to load .env using Node's built-in loader if available, fallback to dotenv
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  } else {
    const dotenv = await import("dotenv");
    dotenv.config();
  }
} catch {
  // Ignore if .env file does not exist yet (defaults will apply)
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
  DISPUTE_MODE: z.enum(["simulated", "sandbox"]).default("simulated"),
  USE_AGENT_TOOLKIT: z.enum(["true", "false"]).transform((v) => v === "true").default("false"),
  DATABASE_PATH: z.string().default("data/agentledger.db"),
  KEYS_DIR: z.string().default("data/keys")
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
