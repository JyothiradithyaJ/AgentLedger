import type { MandateStatus, PurchaseStatus, Mandate, PurchaseRecord } from "@agentledger/shared";

const VALID_MANDATE_TRANSITIONS: Record<MandateStatus, MandateStatus[]> = {
  DRAFT: ["AUTHORIZED", "REVOKED", "EXPIRED"],
  AUTHORIZED: ["ACTIVE", "REVOKED", "EXPIRED"],
  ACTIVE: ["COMPLETED", "REVOKED", "EXPIRED"],
  COMPLETED: [],
  REVOKED: [],
  EXPIRED: []
};

const VALID_PURCHASE_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
  PROPOSED: ["CHECKING", "ALLOWED", "BLOCKED"],
  CHECKING: ["ALLOWED", "BLOCKED", "WAITING_HUMAN"],
  WAITING_HUMAN: ["ALLOWED", "BLOCKED"],
  ALLOWED: ["CAPTURED", "FAILED"],
  BLOCKED: [],
  CAPTURED: [],
  FAILED: []
};

export const canTransitionMandate = (from: MandateStatus, to: MandateStatus): boolean => {
  return VALID_MANDATE_TRANSITIONS[from]?.includes(to) ?? false;
};

export const transitionMandate = (mandate: Mandate, to: MandateStatus): Mandate => {
  if (!canTransitionMandate(mandate.status, to)) {
    throw new Error(`Invalid mandate state transition from ${mandate.status} to ${to}`);
  }
  return {
    ...mandate,
    status: to,
    updatedAt: new Date().toISOString()
  };
};

export const canTransitionPurchase = (from: PurchaseStatus, to: PurchaseStatus): boolean => {
  return VALID_PURCHASE_TRANSITIONS[from]?.includes(to) ?? false;
};

export const transitionPurchase = (purchase: PurchaseRecord, to: PurchaseStatus): PurchaseRecord => {
  if (!canTransitionPurchase(purchase.status, to)) {
    throw new Error(`Invalid purchase state transition from ${purchase.status} to ${to}`);
  }
  return {
    ...purchase,
    status: to,
    updatedAt: new Date().toISOString()
  };
};
