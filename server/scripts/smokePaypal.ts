import { PayPalClient } from "../src/adapters/paypal/client.js";
import { createAuthorizeOrder } from "../src/adapters/paypal/orders.js";
import { env } from "../src/config/env.js";

async function runSmokePaypal() {
  console.log("=== AgentLedger PayPal Smoke Test ===");
  console.log(`Target Base URL: ${env.PAYPAL_BASE_URL}`);

  const client = new PayPalClient();
  const testAmountCents = 12000; // $120.00
  const customId = `smoke_${Date.now()}`;

  console.log(`Creating authorization order for $${(testAmountCents / 100).toFixed(2)} USD...`);
  try {
    const result = await createAuthorizeOrder(client, testAmountCents, "USD", customId);
    console.log("==========================================");
    console.log(`[SUCCESS] Order Created: ${result.orderId}`);
    console.log("Approve URL for Sandbox Buyer:");
    console.log(result.approveUrl);
    console.log("==========================================");
    console.log("Open this URL in a browser, log in with sandbox buyer credentials, and approve the hold.");
  } catch (err) {
    console.error("[FAILURE] PayPal smoke test failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

runSmokePaypal().catch((err) => {
  console.error("Fatal smoke test error:", err);
  process.exit(1);
});
