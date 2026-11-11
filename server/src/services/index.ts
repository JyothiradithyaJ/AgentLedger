import type { Repos } from "../repos/index.js";
import type { PayPalPort } from "../ports/paypal.port.js";
import type { MerchantPort } from "../ports/merchant.port.js";
import type { LLMPort } from "../ports/llm.port.js";
import type { CatalogPort } from "../ports/catalog.port.js";
import { LedgerService } from "./ledgerService.js";
import { MandateService } from "./mandateService.js";
import { PurchaseService } from "./purchaseService.js";
import { DisputeService } from "./disputeService.js";
import { DemoService } from "./demoService.js";

export interface Services {
  mandates: MandateService;
  purchases: PurchaseService;
  ledger: LedgerService;
  disputes: DisputeService;
  demo: DemoService;
}

export const createServices = (
  repos: Repos,
  paypal: PayPalPort,
  merchant: MerchantPort,
  llm: LLMPort,
  catalog?: CatalogPort
): Services => {
  const ledger = new LedgerService(repos);
  const mandates = new MandateService(repos, paypal, llm, ledger);
  const purchases = new PurchaseService(repos, paypal, merchant, llm, ledger, catalog);
  const disputes = new DisputeService(repos, paypal, llm, ledger);
  const demo = new DemoService(repos, mandates, purchases, disputes, ledger);

  return {
    mandates,
    purchases,
    ledger,
    disputes,
    demo
  };
};

export {
  LedgerService,
  MandateService,
  PurchaseService,
  DisputeService,
  DemoService
};
