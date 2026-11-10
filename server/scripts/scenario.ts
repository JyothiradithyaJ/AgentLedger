import { createContainer } from "../src/container.js";

async function runScenarios() {
  console.log("=== AgentLedger Headless Scenario Runner (A to E) ===");
  const container = createContainer();
  const demo = container.services.demo;

  // Scenario A
  console.log("\n-------------------------------------------------");
  console.log("SCENE 1: Scenario A (Inside Mandate - Success)");
  const resA = (await demo.runScenario("A")) as {
    mandate: { budgetCents: number };
    purchase: { capturedAmountCents: number; releasedAmountCents: number; status: string };
  };
  console.log(`[RESULT A] Status: ${resA.purchase.status}`);
  console.log(`[RESULT A] Captured: $${(resA.purchase.capturedAmountCents / 100).toFixed(2)} USD`);
  console.log(`[RESULT A] Released Hold: $${(resA.purchase.releasedAmountCents / 100).toFixed(2)} USD`);

  // Scenario B
  console.log("\n-------------------------------------------------");
  console.log("SCENE 2a: Scenario B (Over Budget - Referee Blocks)");
  const resB = (await demo.runScenario("B")) as {
    purchase: { status: string; failureReason: string; capturedAmountCents: number };
  };
  console.log(`[RESULT B] Status: ${resB.purchase.status}`);
  console.log(`[RESULT B] Captured: $${(resB.purchase.capturedAmountCents / 100).toFixed(2)} USD`);
  console.log(`[RESULT B] Block Reason: ${resB.purchase.failureReason}`);

  // Scenario C
  console.log("\n-------------------------------------------------");
  console.log("SCENE 2b: Scenario C (Resale Merchant - Semantic Check Blocks)");
  const resC = (await demo.runScenario("C")) as {
    purchase: { status: string; failureReason: string; capturedAmountCents: number };
  };
  console.log(`[RESULT C] Status: ${resC.purchase.status}`);
  console.log(`[RESULT C] Block Reason: ${resC.purchase.failureReason}`);

  // Scenario D
  console.log("\n-------------------------------------------------");
  console.log("SCENE 3: Scenario D (Merchant Fault -> Dispute Analysis)");
  const resD = (await demo.runScenario("D")) as {
    dispute: { id: string; status: string };
    verdict: { fault: string; confidence: number; recommendedAction: string };
  };
  console.log(`[RESULT D] Dispute Created: ${resD.dispute.id}`);
  console.log(`[RESULT D] Attributed Fault: ${resD.verdict.fault} (${(resD.verdict.confidence * 100).toFixed(0)}% confidence)`);
  console.log(`[RESULT D] Recommendation: ${resD.verdict.recommendedAction}`);

  // Scenario E
  console.log("\n-------------------------------------------------");
  console.log("SCENE 4: Scenario E (Counterfactual: Referee OFF vs Referee ON)");
  const resE = (await demo.runScenario("E")) as {
    counterfactual: {
      refereeOff: { run: { purchase: { status: string } }; verdict: { fault: string } };
      refereeOn: { run: { purchase: { status: string } } };
    };
  };
  console.log(`[RESULT E - Referee OFF] Status: ${resE.counterfactual.refereeOff.run.purchase.status} -> Fault: ${resE.counterfactual.refereeOff.verdict.fault}`);
  console.log(`[RESULT E - Referee ON] Status: ${resE.counterfactual.refereeOn.run.purchase.status} (Protected)`);

  // Verify Ledger
  console.log("\n-------------------------------------------------");
  console.log("VERIFYING EVIDENCE LEDGER INTEGRITY...");
  const ledgerVerification = container.services.ledger.verify();
  console.log(`[LEDGER] Total Signed Entries: ${ledgerVerification.totalEntries}`);
  console.log(`[LEDGER] Chain Valid: ${ledgerVerification.valid}`);
  console.log("=================================================");
  console.log("All headless scenarios executed successfully.");
}

runScenarios().catch((err) => {
  console.error("Scenario runner failed:", err);
  process.exit(1);
});
