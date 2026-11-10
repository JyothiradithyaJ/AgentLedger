import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";
import type { PayPalClient } from "./client.js";
import { getOrder } from "./orders.js";
import { getDispute } from "./disputes.js";

export interface AgentToolkitTools {
  getOrder: (orderId: string) => Promise<{ orderId: string; status: string }>;
  getDispute: (disputeId: string) => Promise<unknown>;
  listDisputes: () => Promise<unknown[]>;
}

export const createToolkitTools = (client: PayPalClient): AgentToolkitTools => {
  if (env.USE_AGENT_TOOLKIT) {
    logger.info("Initializing PayPal Agent Toolkit tools (experimental)");
  } else {
    logger.info("Using REST fallback for dispute and order lookups");
  }

  return {
    getOrder: async (orderId: string) => {
      return getOrder(client, orderId);
    },
    getDispute: async (disputeId: string) => {
      return getDispute(client, disputeId);
    },
    listDisputes: async () => {
      // In sandbox REST lookup:
      return client.request<unknown>("/v1/customer/disputes").then((res: unknown) => {
        const payload = res as { items?: unknown[] };
        return payload.items ?? [];
      });
    }
  };
};
