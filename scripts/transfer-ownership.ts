import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Transferring ownership with account:', deployer.address);

  // ============================================
  // CONFIGURATION
  // ============================================

  const AGENT_TREASURY_ADDRESS = '0x32faE7187a00f096B0536Ad4872fb324Bae39671';
  const TIMELOCK_ADDRESS = '0x68c01b103134E1b6661720dC7EBfE36bf03Cf51f';

  // ============================================
  // TRANSFER OWNERSHIP
  // ============================================

  const AgentTreasury = await hre.ethers.getContractFactory('AgentTreasury');
  const treasury = AgentTreasury.attach(AGENT_TREASURY_ADDRESS);

  // Check current owner
  const currentOwner = await treasury.owner();
  console.log('Current owner:', currentOwner);

  if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
    console.log('Transferring ownership to timelock:', TIMELOCK_ADDRESS);
    const tx = await treasury.transferOwnership(TIMELOCK_ADDRESS);
    await tx.wait();
    console.log('✅ Ownership transferred! TX:', tx.hash);

    // Verify new owner
    const newOwner = await treasury.owner();
    console.log('New owner:', newOwner);
  } else if (currentOwner.toLowerCase() === TIMELOCK_ADDRESS.toLowerCase()) {
    console.log('✅ Ownership already transferred to timelock');
  } else {
    console.log('⚠️  Owner is neither deployer nor timelock:', currentOwner);
  }

  console.log('\nDone! All owner operations now require 1-hour timelock delay.');
  console.log('Timelock:', TIMELOCK_ADDRESS);
  console.log('Treasury:', AGENT_TREASURY_ADDRESS);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
