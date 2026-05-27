import { TreasuryAgent, type AgentAction, type AgentConfig } from './TreasuryAgent';
import { nodeCron, type ScheduledTask } from 'node-cron';

// ============================================
// TYPES
// ============================================

export interface CronConfig {
  intervalMs: number; // Interval in milliseconds
  agentConfig: AgentConfig;
  enabled: boolean;
  maxRuns?: number;
}

export interface JobStatus {
  id: string;
  running: boolean;
  runCount: number;
  lastRun?: string;
  lastResults?: AgentAction[];
}

// ============================================
// CRON MANAGER WITH NODE-CRON
// ============================================

export class CronManager {
  private jobs: Map<string, ScheduledTask> = new Map();
  private agents: Map<string, TreasuryAgent> = new Map();
  private configs: Map<string, CronConfig> = new Map();
  private runCounts: Map<string, number> = new Map();
  private results: Map<string, AgentAction[][]> = new Map();
  private running: Map<string, boolean> = new Map();

  // ============================================
  // JOB MANAGEMENT
  // ============================================

  addJob(id: string, config: CronConfig): void {
    if (this.jobs.has(id)) {
      throw new Error(`Job ${id} already exists`);
    }

    const agent = new TreasuryAgent(config.agentConfig);
    this.agents.set(id, agent);
    this.configs.set(id, config);
    this.runCounts.set(id, 0);
    this.results.set(id, []);
    this.running.set(id, false);

    console.log(`[CronManager] Added job: ${id} (interval: ${config.intervalMs}ms)`);
  }

  startJob(id: string): void {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Job ${id} not found`);
    }

    if (this.running.get(id)) {
      console.log(`[CronManager] Job ${id} is already running`);
      return;
    }

    // Convert intervalMs to cron expression
    const intervalMinutes = Math.max(1, Math.floor(config.intervalMs / 60000));
    const cronExpression = `*/${intervalMinutes} * * * *`;

    const task = nodeCron.schedule(cronExpression, async () => {
      await this.executeJob(id);
    }, {
      timezone: 'Asia/Ho_Chi_Minh', // Vietnam timezone
    });

    if (task) {
      this.jobs.set(id, task);
      this.running.set(id, true);
      console.log(`[CronManager] Started job ${id} with cron: ${cronExpression}`);
    }
  }

  stopJob(id: string): void {
    const task = this.jobs.get(id);
    if (task) {
      task.stop();
      this.jobs.delete(id);
    }
    this.running.set(id, false);
    console.log(`[CronManager] Stopped job: ${id}`);
  }

  removeJob(id: string): void {
    this.stopJob(id);
    this.agents.delete(id);
    this.configs.delete(id);
    this.runCounts.delete(id);
    this.results.delete(id);
    this.running.delete(id);
    console.log(`[CronManager] Removed job: ${id}`);
  }

  // ============================================
  // JOB EXECUTION
  // ============================================

  private async executeJob(id: string): Promise<void> {
    const agent = this.agents.get(id);
    const runCount = this.runCounts.get(id) || 0;
    const results = this.results.get(id) || [];
    const config = this.configs.get(id);

    if (!agent || !config) {
      console.error(`[CronManager] Agent or config not found for job: ${id}`);
      return;
    }

    // Check max runs
    if (config.maxRuns && runCount >= config.maxRuns) {
      console.log(`[CronManager] Job ${id} reached max runs (${config.maxRuns}), stopping`);
      this.stopJob(id);
      return;
    }

    console.log(`[CronManager] Executing job: ${id} (run #${runCount + 1})`);

    try {
      const actions = await agent.run();
      results.push(actions);
      this.runCounts.set(id, runCount + 1);
      this.results.set(id, results);

      // Log summary
      const successful = actions.filter(a => a.success).length;
      const failed = actions.filter(a => !a.success).length;
      console.log(`[CronManager] Job ${id} complete: ${successful} successful, ${failed} failed`);

    } catch (error) {
      console.error(`[CronManager] Job ${id} failed:`, error);
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  getJobStatus(id: string): JobStatus {
    const runCount = this.runCounts.get(id) || 0;
    const results = this.results.get(id) || [];
    const lastResults = results[results.length - 1] || [];

    return {
      id,
      running: this.running.get(id) || false,
      runCount,
      lastResults,
    };
  }

  getAllJobs(): JobStatus[] {
    const jobs: JobStatus[] = [];
    
    Array.from(this.agents.keys()).forEach(id => {
      jobs.push(this.getJobStatus(id));
    });

    return jobs;
  }

  // ============================================
  // START/STOP ALL
  // ============================================

  startAll(): void {
    Array.from(this.configs.keys()).forEach(id => {
      if (!this.running.get(id)) {
        this.startJob(id);
      }
    });
  }

  stopAll(): void {
    Array.from(this.jobs.keys()).forEach(id => {
      this.stopJob(id);
    });
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let cronManager: CronManager | null = null;

export function getCronManager(): CronManager {
  if (!cronManager) {
    cronManager = new CronManager();
  }
  return cronManager;
}

// ============================================
// QUICK START FUNCTION
// ============================================

export function startTreasuryCron(
  privateKey: `0x${string}`,
  options: {
    intervalMinutes?: number;
    anthropicApiKey?: string;
    maxRuns?: number;
  } = {}
): CronManager {
  const manager = getCronManager();
  
  const config: CronConfig = {
    intervalMs: (options.intervalMinutes || 5) * 60 * 1000, // Default 5 minutes
    agentConfig: {
      privateKey,
      anthropicApiKey: options.anthropicApiKey,
      maxActionsPerCycle: 3,
      balanceThreshold: '1.0',
    },
    enabled: true,
    maxRuns: options.maxRuns,
  };

  manager.addJob('treasury-agent', config);
  manager.startJob('treasury-agent');

  return manager;
}
