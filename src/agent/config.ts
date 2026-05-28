/**
 * Config management for ArcAgent Treasury
 * Persists agent settings to disk
 */

import { promises as fs } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), '.treasury-config.json');

export interface TreasuryConfig {
  strategies: {
    rebalanceThreshold: number;
    minGasReserve: string;
    maxSingleActionPct: number;
    autoApproveBelow: number;
  };
  chains: string[];
  targetAllocation: Record<string, number>;
  agentConfig: {
    maxActionsPerCycle: number;
    balanceThreshold: string;
    intervalMinutes: number;
  };
}

const DEFAULT_CONFIG: TreasuryConfig = {
  strategies: {
    rebalanceThreshold: 0.2,
    minGasReserve: '1.0',
    maxSingleActionPct: 0.1,
    autoApproveBelow: 10,
  },
  chains: ['arcTestnet'],
  targetAllocation: {
    arcTestnet: 1.0,
  },
  agentConfig: {
    maxActionsPerCycle: 3,
    balanceThreshold: '1.0',
    intervalMinutes: 5,
  },
};

export async function loadConfig(): Promise<TreasuryConfig> {
  try {
    await fs.access(CONFIG_PATH);
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: TreasuryConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export async function updateConfig(updates: Partial<TreasuryConfig>): Promise<TreasuryConfig> {
  const current = await loadConfig();
  const updated = { ...current, ...updates };
  await saveConfig(updated);
  return updated;
}

/**
 * Load sensitive credentials from environment variables.
 * NEVER persisted to disk — always read from .env.local / process.env.
 */
export function loadCredentials(): { privateKey: `0x${string}`; anthropicApiKey?: string } {
  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey || privateKey === '0x') {
    throw new Error(
      'AGENT_PRIVATE_KEY not set. Add it to .env.local:\n  AGENT_PRIVATE_KEY=0xYOUR_KEY_HERE'
    );
  }

  return {
    privateKey,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  };
}
