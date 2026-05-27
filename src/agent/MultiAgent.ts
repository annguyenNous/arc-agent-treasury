import { TreasuryAgent, type AgentConfig, type AgentAction } from './TreasuryAgent';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from '../config/chains';

// ============================================
// AGENT ROLES
// ============================================

export type AgentRole = 'payroll' | 'yield' | 'invoice' | 'liquidity' | 'escrow';

export interface SpecializedAgentConfig extends AgentConfig {
  role: AgentRole;
  description: string;
}

// ============================================
// SPECIALIZED AGENTS
// ============================================

export class PayrollAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 5, // Can process multiple payroll payments
    });
  }

  // PayrollAgent uses default analyze from TreasuryAgent
}

export class YieldAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 2, // Conservative for yield operations
    });
  }

  // YieldAgent uses default analyze from TreasuryAgent
}

export class InvoiceAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 4, // Can process multiple invoices
    });
  }

  // InvoiceAgent uses default analyze from TreasuryAgent
}

export class LiquidityAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 3,
    });
  }

  // LiquidityAgent uses default analyze from TreasuryAgent
}

export class EscrowAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 3,
    });
  }

  // EscrowAgent uses default analyze from TreasuryAgent
}

// ============================================
// SUPERVISOR AGENT (Multi-Agent Orchestrator)
// ============================================

export class SupervisorAgent {
  private agents: Map<AgentRole, TreasuryAgent>;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.agents = new Map();

    // Initialize all specialized agents
    this.agents.set('payroll', new PayrollAgent(config));
    this.agents.set('yield', new YieldAgent(config));
    this.agents.set('invoice', new InvoiceAgent(config));
    this.agents.set('liquidity', new LiquidityAgent(config));
    this.agents.set('escrow', new EscrowAgent(config));
  }

  // ============================================
  // DELEGATE TASK TO APPROPRIATE AGENT
  // ============================================

  async delegateTask(task: string): Promise<{ role: AgentRole; actions: AgentAction[] }> {
    // Determine which agent should handle this task
    const role = this.determineRole(task);
    const agent = this.agents.get(role);

    if (!agent) {
      throw new Error(`No agent found for role: ${role}`);
    }

    console.log(`[Supervisor] Delegating to ${role} agent: ${task}`);
    const actions = await agent.run();

    return { role, actions };
  }

  // ============================================
  // RUN ALL AGENTS
  // ============================================

  async runAll(): Promise<Map<AgentRole, AgentAction[]>> {
    console.log('[Supervisor] 🚀 Running all agents...');
    const results = new Map<AgentRole, AgentAction[]>();

    // Run agents in parallel for efficiency
    const promises = Array.from(this.agents.entries()).map(async ([role, agent]) => {
      try {
        const actions = await agent.run();
        results.set(role, actions);
        console.log(`[Supervisor] ✓ ${role}: ${actions.length} actions`);
      } catch (error) {
        console.error(`[Supervisor] ✗ ${role} failed:`, error);
        results.set(role, []);
      }
    });

    await Promise.all(promises);
    console.log('[Supervisor] ✅ All agents completed');
    return results;
  }

  // ============================================
  // RUN SPECIFIC AGENT
  // ============================================

  async runAgent(role: AgentRole): Promise<AgentAction[]> {
    const agent = this.agents.get(role);
    if (!agent) {
      throw new Error(`No agent found for role: ${role}`);
    }

    console.log(`[Supervisor] Running ${role} agent...`);
    return agent.run();
  }

  // ============================================
  // DETERMINE ROLE FROM TASK DESCRIPTION
  // ============================================

  private determineRole(task: string): AgentRole {
    const taskLower = task.toLowerCase();

    if (taskLower.includes('payroll') || taskLower.includes('salary') || taskLower.includes('wage')) {
      return 'payroll';
    }
    if (taskLower.includes('yield') || taskLower.includes('rebalance') || taskLower.includes('invest')) {
      return 'yield';
    }
    if (taskLower.includes('invoice') || taskLower.includes('bill') || taskLower.includes('payment')) {
      return 'invoice';
    }
    if (taskLower.includes('liquidity') || taskLower.includes('pool') || taskLower.includes('lp')) {
      return 'liquidity';
    }
    if (taskLower.includes('escrow') || taskLower.includes('freelance') || taskLower.includes('gig')) {
      return 'escrow';
    }

    // Default to liquidity for general treasury management
    return 'liquidity';
  }

  // ============================================
  // GETTERS
  // ============================================

  getAgent(role: AgentRole): TreasuryAgent | undefined {
    return this.agents.get(role);
  }

  getAllRoles(): AgentRole[] {
    return Array.from(this.agents.keys());
  }

  getAgentCount(): number {
    return this.agents.size;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createSupervisorAgent(privateKey: `0x${string}`, anthropicApiKey?: string): SupervisorAgent {
  return new SupervisorAgent({
    privateKey,
    anthropicApiKey,
    maxActionsPerCycle: 3,
    balanceThreshold: '1.0',
  });
}
