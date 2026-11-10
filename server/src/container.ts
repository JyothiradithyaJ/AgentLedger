import { createRepos, type Repos } from "./repos/index.js";
import { createPayPalAdapter } from "./adapters/paypal/index.js";
import { createMerchantAdapter } from "./adapters/merchant/index.js";
import { createLLMAdapter } from "./adapters/llm/index.js";
import { createServices, type Services } from "./services/index.js";
import type { PayPalPort } from "./ports/paypal.port.js";
import type { MerchantPort } from "./ports/merchant.port.js";
import type { LLMPort } from "./ports/llm.port.js";

export interface Container {
  repos: Repos;
  ports: {
    paypal: PayPalPort;
    merchant: MerchantPort;
    llm: LLMPort;
  };
  services: Services;
}

let containerInstance: Container | null = null;

export const createContainer = (): Container => {
  if (containerInstance) return containerInstance;

  const repos = createRepos();
  const paypal = createPayPalAdapter();
  const merchant = createMerchantAdapter();
  const llm = createLLMAdapter();

  const services = createServices(repos, paypal, merchant, llm);

  containerInstance = {
    repos,
    ports: {
      paypal,
      merchant,
      llm
    },
    services
  };

  return containerInstance;
};
