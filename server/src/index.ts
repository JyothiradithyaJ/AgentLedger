import { env } from "./config/env.js";
import { logger } from "./observability/logger.js";
import { createApp } from "./http/app.js";

export const startServer = () => {
  const app = createApp();

  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(
      { port: env.PORT, host: env.HOST, env: env.NODE_ENV },
      `AgentLedger backend API listening on http://${env.HOST}:${env.PORT}`
    );
  });

  return server;
};

// Auto-start when executed directly
if (process.argv[1]?.includes("index.ts") || process.argv[1]?.includes("index.js")) {
  startServer();
}
