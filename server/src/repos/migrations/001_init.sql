CREATE TABLE IF NOT EXISTS mandates (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  raw_request TEXT NOT NULL,
  readback TEXT NOT NULL,
  constraints_json TEXT NOT NULL,
  status TEXT NOT NULL,
  budget_cents INTEGER NOT NULL,
  held_cents INTEGER NOT NULL DEFAULT 0,
  captured_cents INTEGER NOT NULL DEFAULT 0,
  remaining_cents INTEGER NOT NULL,
  paypal_order_id TEXT,
  paypal_authorization_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  mandate_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  cart_json TEXT NOT NULL,
  referee_decision_json TEXT,
  human_decision TEXT,
  status TEXT NOT NULL,
  paypal_capture_id TEXT,
  captured_amount_cents INTEGER NOT NULL DEFAULT 0,
  released_amount_cents INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mandate_id) REFERENCES mandates(id)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  sequence INTEGER PRIMARY KEY,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  mandate_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  signature TEXT NOT NULL,
  public_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  paypal_dispute_id TEXT NOT NULL,
  mandate_id TEXT NOT NULL,
  purchase_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  is_simulated INTEGER NOT NULL DEFAULT 0,
  allowed_evidence_types_json TEXT NOT NULL DEFAULT '[]',
  verdict_json TEXT,
  evidence_submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mandate_id) REFERENCES mandates(id),
  FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_mandate ON purchases(mandate_id);
CREATE INDEX IF NOT EXISTS idx_ledger_mandate ON ledger_entries(mandate_id);
CREATE INDEX IF NOT EXISTS idx_disputes_mandate ON disputes(mandate_id);
