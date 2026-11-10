import { createContainer } from "../src/container.js";

async function runVerify() {
  console.log("=== Verifying Cryptographic Evidence Ledger ===");
  const container = createContainer();
  const result = container.services.ledger.verify();

  console.log(`Total Entries: ${result.totalEntries}`);
  if (result.valid) {
    console.log("[SUCCESS] Entire ledger chain is cryptographically VALID.");
    console.log("All SHA-256 hashes and Ed25519 signatures verified.");
    process.exit(0);
  } else {
    console.error(`[FAILURE] Broken chain detected at sequence ${result.brokenSequence}`);
    console.error(`Reason: ${result.reason}`);
    process.exit(1);
  }
}

runVerify().catch((err) => {
  console.error("Verification crashed:", err);
  process.exit(1);
});
