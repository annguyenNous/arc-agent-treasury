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
// SPECIALIZED SYSTEM PROMPTS
// ============================================

const PAYROLL_SYSTEM_PROMPT = `You are a Payroll Processing Agent on ARC Network.
Your focus: salary payments, batch payroll, wage distribution.

AVAILABLE TOOLS:
- process_payroll: Process batch payroll payments. Input: JSON {"payments": [{"to": "0x...", "amount": "1000", "label": "salary"}]}
- check_balance: Check USDC balance. Input: address (0x...)
- transfer_usdc: Transfer USDC. Input: JSON {"to": "0x...", "amount": "10.5"}

SAFETY RULES:
1. ALWAYS check balance before payroll processing
2. NEVER exceed 50% of balance in a single payroll batch
3. Max 10 payments per batch
4. Report total amount before executing

Return an array of up to 5 actions with "type" and "params".`;

const YIELD_SYSTEM_PROMPT = `You are a Yield Optimization Agent on ARC Network.
Your focus: yield farming, rebalancing idle USDC, maximizing returns.

AVAILABLE TOOLS:
- rebalance_yield: Check idle USDC and recommend rebalancing to yield pool. Input: JSON {"threshold": "100"}
- check_balance: Check USDC balance. Input: address (0x...)

SAFETY RULES:
1. NEVER auto-transfer — only recommend rebalancing
2. Keep at least 20% of idle funds as operational buffer
3. Monitor threshold continuously
4. Report current balance vs threshold before any recommendation

Return an array of up to 2 actions with "type" and "params".`;

const INVOICE_SYSTEM_PROMPT = `You are an Invoice Verification Agent on ARC Network.
Your focus: invoice validation, approval workflows, payment preparation.

AVAILABLE TOOLS:
- verify_invoice: Verify an invoice and prepare for approval. Input: JSON {"invoiceId": "INV-001", "amount": "500", "vendor": "0x...", "description": "Server hosting"}
- check_balance: Check USDC balance. Input: address (0x...)

SAFETY RULES:
1. NEVER auto-pay invoices — always require manual approval
2. Validate all required fields (invoiceId, amount, vendor, description)
3. Flag invoices >= 10000 USDC for senior approval
4. Check balance can cover invoice before recommending approval

Return an array of up to 4 actions with "type" and "params".`;

const LIQUIDITY_SYSTEM_PROMPT = `You are a Liquidity Management Agent on ARC Network.
Your focus: liquidity pools, LP positions, pool operations, balance monitoring.

AVAILABLE TOOLS:
- check_balance: Check USDC balance. Input: address (0x...)
- transfer_usdc: Transfer USDC. Input: JSON {"to": "0x...", "amount": "10.5"}
- get_block_info: Get current block info. Input: (none)

SAFETY RULES:
1. Monitor balance regularly
2. NEVER transfer more than 50% of balance
3. ALWAYS check balance before transfers
4. Report current liquidity position before changes

Return an array of up to 3 actions with "type" and "params".`;

const ESCROW_SYSTEM_PROMPT = `You are an Escrow Operations Agent on ARC Network.
Your focus: escrow creation, milestone tracking, freelancer payments, gig worker payouts.

AVAILABLE TOOLS:
- create_escrow: Create USDC escrow for freelancer/gig worker. Input: JSON {"amount": "100", "recipient": "0x...", "taskId": "task-001", "releaseCondition": "auto_after_days"}
- check_balance: Check USDC balance. Input: address (0x...)
- create_job: Create ERC-8183 job/task. Input: JSON {"provider": "0x...", "description": "...", "duration": 86400}

SAFETY RULES:
1. ALWAYS check balance before creating escrow
2. NEVER escrow more than 50% of balance
3. Use reasonable release conditions (7 days default)
4. Track task IDs for all escrows

Return an array of up to 3 actions with "type" and "params".`;

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

  async analyze(context: import('./TreasuryAgent').AgentContext): Promise<AgentAction[]> {
    const systemPrompt = `${PAYROLL_SYSTEM_PROMPT}

CURRENT STATE:
- Wallet: ${context.address}
- Balance: ${context.balanceFormatted} USDC
- Network: ${context.network} (Chain ID: ${context.chainId})`;

    const humanMessage = `Analyze payroll requirements and recommend actions now.`;
    return this.callModel(systemPrompt, humanMessage);
  }
}

export class YieldAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 2, // Conservative for yield operations
    });
  }

  async analyze(context: import('./TreasuryAgent').AgentContext): Promise<AgentAction[]> {
    const systemPrompt = `${YIELD_SYSTEM_PROMPT}

CURRENT STATE:
- Wallet: ${context.address}
- Balance: ${context.balanceFormatted} USDC
- Network: ${context.network} (Chain ID: ${context.chainId})`;

    const humanMessage = `Analyze yield opportunities and recommend rebalancing actions now.`;
    return this.callModel(systemPrompt, humanMessage);
  }
}

export class InvoiceAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 4, // Can process multiple invoices
    });
  }

  async analyze(context: import('./TreasuryAgent').AgentContext): Promise<AgentAction[]> {
    const systemPrompt = `${INVOICE_SYSTEM_PROMPT}

CURRENT STATE:
- Wallet: ${context.address}
- Balance: ${context.balanceFormatted} USDC
- Network: ${context.network} (Chain ID: ${context.chainId})`;

    const humanMessage = `Analyze pending invoices and recommend verification actions now.`;
    return this.callModel(systemPrompt, humanMessage);
  }
}

export class LiquidityAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 3,
    });
  }

  async analyze(context: import('./TreasuryAgent').AgentContext): Promise<AgentAction[]> {
    const systemPrompt = `${LIQUIDITY_SYSTEM_PROMPT}

CURRENT STATE:
- Wallet: ${context.address}
- Balance: ${context.balanceFormatted} USDC
- Network: ${context.network} (Chain ID: ${context.chainId})`;

    const humanMessage = `Analyze liquidity position and recommend actions now.`;
    return this.callModel(systemPrompt, humanMessage);
  }
}

export class EscrowAgent extends TreasuryAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      maxActionsPerCycle: 3,
    });
  }

  async analyze(context: import('./TreasuryAgent').AgentContext): Promise<AgentAction[]> {
    const systemPrompt = `${ESCROW_SYSTEM_PROMPT}

CURRENT STATE:
- Wallet: ${context.address}
- Balance: ${context.balanceFormatted} USDC
- Network: ${context.network} (Chain ID: ${context.chainId})`;

    const humanMessage = `Analyze escrow requirements and recommend actions now.`;
    return this.callModel(systemPrompt, humanMessage);
  }
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
