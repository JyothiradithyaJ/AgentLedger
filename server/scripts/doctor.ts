import { env } from "../src/config/env.js";
import { PayPalClient } from "../src/adapters/paypal/client.js";

async function runDoctor() {
  console.log("=== AgentLedger System Doctor ===");
  let allHealthy = true;

  // 1. Check Node version
  const [major] = process.versions.node.split(".").map(Number);
  if (major && major >= 20) {
    console.log(`[PASS] Node version is v${process.versions.node} (LTS 20+ requirement met)`);
  } else {
    console.error(`[FAIL] Node version is v${process.versions.node}; requires 20 or higher`);
    allHealthy = false;
  }

  // 2. Check Working Directory path
  const cwd = process.cwd();
  console.log(`[INFO] Current working directory: ${cwd}`);
  if (cwd.startsWith("D:") || cwd.startsWith("d:")) {
    console.log(`[PASS] Working on D: drive as specified`);
  } else {
    console.warn(`[WARN] Working directory is not on D: drive (${cwd})`);
  }

  // 3. Check PayPal Connectivity / Token
  console.log(`[INFO] PayPal Mode: ${env.PAYPAL_MODE}`);
  if (env.PAYPAL_MODE === "mock") {
    console.log("[PASS] PayPal operating in MOCK mode (skipping live sandbox auth check)");
  } else {
    try {
      const client = new PayPalClient();
      console.log("[INFO] Testing PayPal Sandbox token generation...");
      const token = await client.getAccessToken();
      if (token && token.length > 10) {
        console.log(`[PASS] PayPal OAuth token acquired successfully (${token.slice(0, 10)}...)`);
      } else {
        console.error("[FAIL] Acquired empty token from PayPal Sandbox");
        allHealthy = false;
      }
    } catch (err) {
      console.error(`[FAIL] PayPal Sandbox authentication failed:`, err instanceof Error ? err.message : err);
      allHealthy = false;
    }
  }

  // 4. Check LLM Configuration
  console.log(`[INFO] LLM Provider configured: ${env.LLM_PROVIDER}`);
  if (env.LLM_PROVIDER === "mock") {
    console.log("[PASS] LLM operating with deterministic mock provider");
  } else if (env.LLM_PROVIDER === "gemini") {
    if (!env.GEMINI_API_KEY) {
      console.warn("[WARN] GEMINI_API_KEY is not set in environment (fallback to mock recommended)");
    } else {
      console.log(`[PASS] Gemini API Key present; configured model: ${env.GEMINI_MODEL}`);
    }
  }

  // Summary
  console.log("================================");
  if (allHealthy) {
    console.log("Result: All essential doctor checks PASSED.");
    process.exit(0);
  } else {
    console.log("Result: One or more checks failed. Please review error messages above.");
    process.exit(1);
  }
}

runDoctor().catch((err) => {
  console.error("Doctor crashed with error:", err);
  process.exit(1);
});
