import { TreasuryAgent, type AgentAction, type AgentConfig } from './TreasuryAgent';
import { SupervisorAgent, createSupervisorAgent, type AgentRole } from './MultiAgent';
import nodeCron from 'node-cron';

// ============================================
// TYPES
// ============================================

export interface CronConfig {
  intervalMs: number;
  agentConfig: AgentConfig;
  enabled: boolean;
  maxRuns?: number;
  multiAgent?: boolean; // Enable multi-agent mode
}

export interface JobStatus {
  id: string;
  running: boolean;
  runCount: number;
  lastRun?: string;
  lastResults?: AgentAction[];
  mode?: 'single' | 'multi';
}

// ============================================
// CRON MANAGER WITH MULTI-AGENT SUPPORT
// ============================================

export class CronManager {
  private jobs: Map<string, any> = new Map();
  private agents: Map<string, TreasuryAgent> = new Map();
  private supervisors: Map<string, SupervisorAgent> = new Map();
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

    if (config.multiAgent) {
      // Create supervisor with all specialized agents
      const supervisor = createSupervisorAgent(
        config.agentConfig.privateKey,
        config.agentConfig.apiKey
      );
      this.supervisors.set(id, supervisor);
    } else {
      // Create single agent
      const agent = new TreasuryAgent(config.agentConfig);
      this.agents.set(id, agent);
    }

    this.configs.set(id, config);
    this.runCounts.set(id, 0);
    this.results.set(id, []);
    this.running.set(id, false);

    console.log(`[CronManager] Added job: ${id} (mode: ${config.multiAgent ? 'multi-agent' : 'single'})`);
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

    const intervalMinutes = Math.max(1, Math.floor(config.intervalMs / 60000));
    const cronExpression = `*/${intervalMinutes} * * * *`;

    const task = nodeCron.schedule(cronExpression, async () => {
      await this.executeJob(id);
    }, {
      timezone: 'Asia/Ho_Chi_Minh',
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
    this.supervisors.delete(id);
    this.configs.delete(id);
    this.runCounts.delete(id);
    this.results.delete(id);
    this.running.delete(id);
    console.log(`[CronManager] Removed job: ${id}`);
  }

  // ============================================
  // JOB EXECUTION (SINGLE OR MULTI-AGENT)
  // ============================================

  private async executeJob(id: string): Promise<void> {
    const config = this.configs.get(id);
    const runCount = this.runCounts.get(id) || 0;
    const results = this.results.get(id) || [];

    if (!config) {
      console.error(`[CronManager] Config not found for job: ${id}`);
      return;
    }

    if (config.maxRuns && runCount >= config.maxRuns) {
      console.log(`[CronManager] Job ${id} reached max runs (${config.maxRuns}), stopping`);
      this.stopJob(id);
      return;
    }

    console.log(`[CronManager] Executing job: ${id} (run #${runCount + 1})`);

    try {
      let actions: AgentAction[] = [];

      if (config.multiAgent) {
        // Multi-agent mode: run all specialized agents
        const supervisor = this.supervisors.get(id);
        if (supervisor) {
          const allResults = await supervisor.runAll();
          actions = Array.from(allResults.values()).flat();
        }
      } else {
        // Single agent mode
        const agent = this.agents.get(id);
        if (agent) {
          actions = await agent.run();
        }
      }

      results.push(actions);
      this.runCounts.set(id, runCount + 1);
      this.results.set(id, results);

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
    const config = this.configs.get(id);
    const runCount = this.runCounts.get(id) || 0;
    const results = this.results.get(id) || [];
    const lastResults = results[results.length - 1] || [];

    return {
      id,
      running: this.running.get(id) || false,
      runCount,
      lastResults,
      mode: config?.multiAgent ? 'multi' : 'single',
    };
  }

  getAllJobs(): JobStatus[] {
    const jobs: JobStatus[] = [];
    Array.from(this.configs.keys()).forEach(id => {
      jobs.push(this.getJobStatus(id));
    });
    return jobs;
  }

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
// QUICK START FUNCTIONS
// ============================================

export function startTreasuryCron(
  privateKey: `0x${string}`,
  options: {
    intervalMinutes?: number;
    apiKey?: string;
    maxRuns?: number;
  } = {}
): CronManager {
  const manager = getCronManager();
  
  const config: CronConfig = {
    intervalMs: (options.intervalMinutes || 5) * 60 * 1000,
    agentConfig: {
      privateKey,
      apiKey: options.apiKey,
      maxActionsPerCycle: 3,
      balanceThreshold: '1.0',
    },
    enabled: true,
    maxRuns: options.maxRuns,
    multiAgent: false,
  };

  manager.addJob('treasury-agent', config);
  manager.startJob('treasury-agent');

  return manager;
}

export function startMultiAgentCron(
  privateKey: `0x${string}`,
  options: {
    intervalMinutes?: number;
    apiKey?: string;
    maxRuns?: number;
  } = {}
): CronManager {
  const manager = getCronManager();
  
  const config: CronConfig = {
    intervalMs: (options.intervalMinutes || 5) * 60 * 1000,
    agentConfig: {
      privateKey,
      apiKey: options.apiKey,
      maxActionsPerCycle: 3,
      balanceThreshold: '1.0',
    },
    enabled: true,
    maxRuns: options.maxRuns,
    multiAgent: true, // Enable multi-agent mode
  };

  manager.addJob('multi-agent-treasury', config);
  manager.startJob('multi-agent-treasury');

  return manager;
}
