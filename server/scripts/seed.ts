import { createContainer } from "../src/container.js";

async function runSeed() {
  console.log("=== Seeding AgentLedger Database ===");
  const container = createContainer();

  console.log("Creating default seed mandate...");
  const { mandate } = await container.services.mandates.createMandate(
    "Buy white running shoes, size 10, under $120, no resale sites",
    "The agent may spend up to $120 on running shoes, size 10, never from resale sites.",
    {
      budgetAmountCents: 12000,
      currency: "USD",
      itemCategory: "running shoes",
      size: "10",
      attributes: ["white"],
      merchantAllow: [],
      merchantDeny: ["ReSole Outlet"]
    }
  );

  console.log(`Seed Mandate created: ${mandate.id} (${mandate.description})`);
  console.log("Authorizing hold for seed mandate...");
  const authorized = await container.services.mandates.authorizeMandate(mandate.id);
  console.log(`Hold active for: $${(authorized.heldCents / 100).toFixed(2)} USD`);

  console.log("=== Database Seeding Complete ===");
}

runSeed().catch((err) => {
  console.error("Failed to seed database:", err);
  process.exit(1);
});
