import { TreasuryAgent } from '../src/agent/TreasuryAgent';
import { startTreasuryCron } from '../src/agent/CronManager';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
  apiKey: process.env.AI_API_KEY,
  apiBaseUrl: process.env.AI_API_BASE_URL,
  modelName: process.env.AI_MODEL_NAME,
  mode: process.argv[2] || 'once', // 'once' or 'cron'
  intervalMinutes: parseInt(process.argv[3] || '5'),
  maxRuns: parseInt(process.argv[4] || '0'), // 0 = unlimited
};

// ============================================
// VALIDATION
// ============================================

function validateConfig(): void {
  if (!CONFIG.privateKey || CONFIG.privateKey === '0x') {
    console.error('Error: AGENT_PRIVATE_KEY not set in .env.local');
    console.error('Please add: AGENT_PRIVATE_KEY=0x...');
    process.exit(1);
  }

  if (!CONFIG.apiKey) {
    console.warn('Warning: AI_API_KEY not set. AI analysis will be limited.');
  }
}

// ============================================
// RUN ONCE
// ============================================

async function runOnce(): Promise<void> {
  console.log('\n=== ArcAgent Treasury - Single Run ===\n');

  const agent = new TreasuryAgent({
    privateKey: CONFIG.privateKey,
    apiKey: CONFIG.apiKey, apiBaseUrl: CONFIG.apiBaseUrl, modelName: CONFIG.modelName,
    maxActionsPerCycle: 5,
  });

  console.log(`Agent Address: ${agent.getAgentAddress()}`);
  console.log('Starting analysis...\n');

  const results = await agent.run();

  console.log('\n=== Results ===\n');
  results.forEach((result, i) => {
    const status = result.success ? '✓' : '✗';
    console.log(`${i + 1}. ${status} ${result.type}`);
    console.log(`   Result: ${result.result}`);
    if (result.txHash) {
      console.log(`   TX: https://testnet.arcscan.app/tx/${result.txHash}`);
    }
    console.log('');
  });

  console.log('=== Complete ===\n');
}

// ============================================
// RUN CRON
// ============================================

async function runCron(): Promise<void> {
  console.log('\n=== ArcAgent Treasury - Cron Mode ===\n');

  const manager = startTreasuryCron(CONFIG.privateKey, {
    intervalMinutes: CONFIG.intervalMinutes,
    apiKey: CONFIG.apiKey, apiBaseUrl: CONFIG.apiBaseUrl, modelName: CONFIG.modelName,
    maxRuns: CONFIG.maxRuns || undefined,
  });

  console.log(`Cron started: every ${CONFIG.intervalMinutes} minutes`);
  if (CONFIG.maxRuns) {
    console.log(`Max runs: ${CONFIG.maxRuns}`);
  }
  console.log('Press Ctrl+C to stop\n');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nStopping cron...');
    manager.stopAll();
    process.exit(0);
  });

  // Status check every minute
  setInterval(() => {
    const jobs = manager.getAllJobs();
    jobs.forEach(job => {
      console.log(`[Status] ${job.id}: ${job.runCount} runs, ${job.running ? 'running' : 'stopped'}`);
    });
  }, 60000);
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  validateConfig();

  console.log('==========================================');
  console.log('  ArcAgent Treasury - AI Agent Runner');
  console.log('  ARC Testnet (Chain ID: 5042002)');
  console.log('==========================================\n');

  switch (CONFIG.mode) {
    case 'once':
      await runOnce();
      break;
    case 'cron':
      await runCron();
      break;
    default:
      console.error(`Unknown mode: ${CONFIG.mode}`);
      console.error('Usage: tsx scripts/run-agent.ts [once|cron] [intervalMinutes] [maxRuns]');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
