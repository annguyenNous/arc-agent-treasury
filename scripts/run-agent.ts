import { TreasuryAgent } from '../src/agent/TreasuryAgent';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
  
  if (!privateKey || privateKey === '0x') {
    console.error('Error: AGENT_PRIVATE_KEY not set in .env.local');
    process.exit(1);
  }

  console.log('=== ArcAgent Treasury Agent ===');
  console.log('Network: ARC Testnet (Chain ID: 5042002)');
  console.log('Starting agent cycle...\n');

  const agent = new TreasuryAgent(privateKey);
  
  // Run once
  const results = await agent.run();
  
  console.log('\n=== Results ===');
  results.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.type}`);
    console.log(`   Result: ${result.result}`);
    if (result.txHash) {
      console.log(`   TX: https://testnet.arcscan.app/tx/${result.txHash}`);
    }
  });

  console.log('\n=== Agent cycle complete ===');
}

main().catch(console.error);
