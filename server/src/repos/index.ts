import type { DatabaseSync } from "./db.js";
import { MandateRepo } from "./mandateRepo.js";
import { PurchaseRepo } from "./purchaseRepo.js";
import { LedgerRepo } from "./ledgerRepo.js";
import { DisputeRepo } from "./disputeRepo.js";
import { getDb, initDb } from "./db.js";

export interface Repos {
  mandates: MandateRepo;
  purchases: PurchaseRepo;
  ledger: LedgerRepo;
  disputes: DisputeRepo;
}

export const createRepos = (db: DatabaseSync = getDb()): Repos => {
  return {
    mandates: new MandateRepo(db),
    purchases: new PurchaseRepo(db),
    ledger: new LedgerRepo(db),
    disputes: new DisputeRepo(db)
  };
};

export { getDb, initDb, MandateRepo, PurchaseRepo, LedgerRepo, DisputeRepo };
