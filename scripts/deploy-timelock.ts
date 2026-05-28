import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying TreasuryTimelock with account:', deployer.address);

  // ============================================
  // CONFIGURATION
  // ============================================

  // Minimum delay: 1 hour (3600 seconds) for testnet, use 24-48h for mainnet
  const MIN_DELAY = 3600;

  // Proposers: the deployer (or multisig on mainnet)
  const proposers = [deployer.address];

  // Executors: address(0) means anyone can execute after delay
  const executors = ['0x0000000000000000000000000000000000000000'];

  // Admin: deployer initially, can renounce later
  const admin = deployer.address;

  // ============================================
  // DEPLOY TIMELOCK
  // ============================================

  const TreasuryTimelock = await hre.ethers.getContractFactory('TreasuryTimelock');
  const timelock = await TreasuryTimelock.deploy(MIN_DELAY, proposers, executors, admin);
  await timelock.waitForDeployment();

  const timelockAddress = await timelock.getAddress();
  console.log('TreasuryTimelock deployed to:', timelockAddress);

  // ============================================
  // TRANSFER OWNERSHIP (if AgentTreasury already deployed)
  // ============================================

  // Uncomment and set the AgentTreasury address after deploying it:
  //
  // const AGENT_TREASURY_ADDRESS = '0x32faE7187a00f096B0536Ad4872fb324Bae39671';
  // const AgentTreasury = await hre.ethers.getContractFactory('AgentTreasury');
  // const treasury = AgentTreasury.attach(AGENT_TREASURY_ADDRESS);
  //
  // // Transfer ownership to timelock
  // console.log('Transferring AgentTreasury ownership to timelock...');
  // const tx = await treasury.transferOwnership(timelockAddress);
  // await tx.wait();
  // console.log('Ownership transferred to timelock:', timelockAddress);
  //
  // // To execute a timelock operation (example: emergency pause):
  // // 1. Schedule: await timelock.schedule(treasuryAddress, 0, treasury.interface.encodeFunctionData('emergencyPause'), hre.ethers.ZeroHash, hre.ethers.ZeroHash, MIN_DELAY);
  // // 2. Wait: MIN_DELAY seconds
  // // 3. Execute: await timelock.execute(treasuryAddress, 0, treasury.interface.encodeFunctionData('emergencyPause'), hre.ethers.ZeroHash, hre.ethers.ZeroHash);

  console.log('\nNext steps:');
  console.log('1. Verify on explorer:', `npx hardhat verify --network arcTestnet ${timelockAddress} ${MIN_DELAY} "${proposers}" "${executors}" "${admin}"`);
  console.log('2. Transfer AgentTreasury ownership to this timelock');
  console.log('3. All owner operations now require timelock delay');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
