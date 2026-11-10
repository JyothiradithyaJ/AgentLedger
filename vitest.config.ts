import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    preserveSymlinks: true
  },
  test: {
    globals: true,
    environment: "node",
    testTimeout: 15000,
    env: {
      PAYPAL_MODE: "mock",
      LLM_PROVIDER: "mock",
      DISPUTE_MODE: "simulated",
      NODE_ENV: "test",
      USE_AGENT_TOOLKIT: "false"
    }
  }
});
