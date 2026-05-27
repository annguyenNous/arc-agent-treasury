import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AgentTreasury with account:", deployer.address);

  // USDC on ARC Testnet
  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

  const AgentTreasury = await hre.ethers.getContractFactory("AgentTreasury");
  const treasury = await AgentTreasury.deploy(USDC_ADDRESS);

  await treasury.waitForDeployment();

  const address = await treasury.getAddress();
  console.log("AgentTreasury deployed to:", address);
  console.log("Explorer:", `https://testnet.arcscan.app/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
