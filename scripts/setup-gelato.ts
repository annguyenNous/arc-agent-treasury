/**
 * Setup Gelato Automated Payment Execution
 *
 * After deploying AgentTreasury, register it with Gelato for
 * automated payment execution. Gelato will call checkUpkeep()
 * off-chain and performUpkeep() on-chain when payments are ready.
 *
 * Usage:
 *   npx tsx scripts/setup-gelato.ts
 *
 * Prerequisites:
 *   - AgentTreasury deployed on ARC Testnet
 *   - Gelato account at https://app.gelato.network
 *   - TASK_ID set after creating the task
 */

import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "0x32faE7187a00f096B0536Ad4872fb324Bae39671";

async function main() {
  console.log("=== Gelato Automation Setup ===\n");
  console.log("Treasury Address:", TREASURY_ADDRESS);
  console.log("Network: ARC Testnet (Chain ID: 5042002)\n");

  // Step 1: Verify contract has automation interface
  const treasury = await hre.ethers.getContractAt("AgentTreasury", TREASURY_ADDRESS);

  try {
    // Test checkUpkeep with empty data
    const [upkeepNeeded, performData] = await treasury.checkUpkeep("0x");
    console.log("✓ Contract supports IAutomationCompatible");
    console.log(`  Upkeep needed: ${upkeepNeeded}`);
    console.log(`  Perform data: ${performData}\n`);
  } catch (error) {
    console.error("✗ Contract does not support checkUpkeep. Redeploy with automation support.");
    process.exit(1);
  }

  // Step 2: Check ready payments
  try {
    const readyPayments = await treasury.getReadyPayments();
    console.log(`Ready payments: ${readyPayments.length}`);
    if (readyPayments.length > 0) {
      console.log(`  IDs: ${readyPayments.join(", ")}\n`);
    }
  } catch (error) {
    console.log("No payments scheduled yet.\n");
  }

  // Step 3: Display Gelato setup instructions
  console.log("=== Gelato Setup Instructions ===\n");
  console.log("1. Go to https://app.gelato.network");
  console.log("2. Connect your wallet (must be contract owner)");
  console.log("3. Create a new task:");
  console.log(`   - Contract: ${TREASURY_ADDRESS}`);
  console.log("   - Function: performUpkeep(bytes)");
  console.log("   - Network: ARC Testnet");
  console.log("   - Schedule: Every 1 minute (or cron: */1 * * * *)");
  console.log("   - Resolver: checkUpkeep(bytes) → returns (bool, bytes)");
  console.log("4. Fund the Gelato task with gas (USDC on ARC Testnet)");
  console.log("5. Save the TASK_ID to .env.local:");
  console.log("   GELATO_TASK_ID=<your-task-id>\n");

  // Alternative: Chainlink Automation
  console.log("=== Alternative: Chainlink Automation ===\n");
  console.log("1. Go to https://automation.chainlink.dev");
  console.log("2. Register new Upkeep:");
  console.log(`   - Target: ${TREASURY_ADDRESS}`);
  console.log("   - Type: Custom logic");
  console.log("   - Gas limit: 500,000");
  console.log("   - Check data: 0x (empty = scan all payments)");
  console.log("3. Fund with LINK tokens\n");

  console.log("=== Setup Complete ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
