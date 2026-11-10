import { createContainer } from "../src/container.js";
import { logger } from "../src/observability/logger.js";

async function runReauthorizeJob() {
  console.log("=== AgentLedger Reauthorization Job ===");
  const container = createContainer();
  const mandates = container.repos.mandates.listAll();

  // Find active mandates with uncaptured holds
  const activeMandates = mandates.filter(
    (m) => m.status === "ACTIVE" && m.heldCents > 0 && m.paypalAuthorizationId
  );

  console.log(`Found ${activeMandates.length} active mandate holds eligible for honor-period extension.`);

  for (const mandate of activeMandates) {
    if (!mandate.paypalAuthorizationId) continue;
    try {
      console.log(`Reauthorizing hold for mandate ${mandate.id} ($${(mandate.heldCents / 100).toFixed(2)} USD)...`);
      const result = await container.ports.paypal.reauthorize(
        mandate.paypalAuthorizationId,
        mandate.heldCents,
        mandate.constraints.currency,
        `reauth_${mandate.id}_${Date.now()}`
      );

      console.log(`[SUCCESS] Reauthorized. New Authorization ID: ${result.authorizationId}`);

      mandate.paypalAuthorizationId = result.authorizationId;
      container.repos.mandates.update(mandate);

      container.services.ledger.recordEvent("MANDATE_AUTHORIZED", mandate.id, {
        reauthorized: true,
        authorizationId: result.authorizationId,
        heldCents: mandate.heldCents
      });
    } catch (err) {
      logger.error({ err, mandateId: mandate.id }, "Failed to reauthorize hold");
    }
  }

  console.log("=== Reauthorization Job Finished ===");
}

runReauthorizeJob().catch((err) => {
  console.error("Job error:", err);
  process.exit(1);
});
