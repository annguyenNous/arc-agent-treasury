import hre from 'hardhat';

async function main() {
  const timelockAddress = '0x68c01b103134E1b6661720dC7EBfE36bf03Cf51f';
  const deployer = '0xd8bdBaf59612A8D19085B05E2020381950cE3073';

  await hre.run('verify:verify', {
    address: timelockAddress,
    constructorArguments: [
      3600,                          // minDelay
      [deployer],                    // proposers
      ['0x0000000000000000000000000000000000000000'], // executors (anyone)
      deployer,                      // admin
    ],
    contract: 'contracts/TreasuryTimelock.sol:TreasuryTimelock',
  });

  console.log('Verification submitted!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
