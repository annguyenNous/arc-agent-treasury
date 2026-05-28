import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Tool } from '@langchain/core/tools';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, USDC_ADDRESS, AGENT_TREASURY, AGENTIC_COMMERCE, IDENTITY_REGISTRY, REPUTATION_REGISTRY } from '../config/chains';
import { USDC_ABI, AGENTIC_COMMERCE_ABI, IDENTITY_REGISTRY_ABI, REPUTATION_ABI, TREASURY_ABI } from '../contracts/abis';
import { CreateEscrowTool, RebalanceYieldTool, ProcessPayrollTool, VerifyInvoiceTool } from './tools';

// ============================================
// TYPES
// ============================================

export interface AgentAction {
  type: string;
  params: Record<string, unknown>;
  result?: string;
  txHash?: Hash;
  success: boolean;
  timestamp: string;
  retryCount?: number;
}

export interface AgentContext {
  address: Address;
  balance: bigint;
  balanceFormatted: string;
  chainId: number;
  network: string;
  recentActions: AgentAction[];
}

export interface AgentConfig {
  privateKey: `0x${string}`;
  anthropicApiKey?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  modelName?: string;
  maxActionsPerCycle?: number;
  balanceThreshold?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

// ============================================
// RETRY UTILITY
// ============================================

async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    delayMs: number;
    backoffMultiplier: number;
    label: string;
  }
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < options.maxRetries) {
        const delay = options.delayMs * Math.pow(options.backoffMultiplier, attempt);
        console.warn(
          `[Retry] ${options.label} attempt ${attempt + 1}/${options.maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`${options.label} failed after ${options.maxRetries + 1} attempts: ${lastError?.message}`);
}

// ============================================
// LANGCHAIN TOOLS
// ============================================

class CheckBalanceTool extends Tool {
  name = 'check_balance';
  description = 'Check USDC balance of an address. Input: address (0x...)';
  
  private publicClient;
  
  constructor(publicClient: ReturnType<typeof createPublicClient>) {
    super();
    this.publicClient = publicClient;
  }

  async _call(input: string): Promise<string> {
    try {
      // Handle both plain address and JSON input
      let address: string;
      try {
        const parsed = JSON.parse(input);
        address = parsed.address || parsed.to || parsed.addr || input;
      } catch {
        address = input.trim();
      }
      
      // Strip quotes if present
      address = address.replace(/^["']|["']$/g, '');
      
      if (!address.startsWith('0x') || address.length !== 42) {
        return `Error: Invalid address "${address}". Must be 0x + 40 hex chars.`;
      }

      const balance = await this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address as Address],
      });
      return `Balance: ${formatUnits(balance, 6)} USDC`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Error: ${message}`;
    }
  }
}

class TransferUSDCTool extends Tool {
  name = 'transfer_usdc';
  description = 'Transfer USDC. Input: JSON {"to": "0x...", "amount": "10.5"}';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { to, amount } = JSON.parse(input);

      // Validate inputs
      if (!to || typeof to !== 'string' || !to.startsWith('0x')) {
        return 'Error: Invalid recipient address';
      }
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return 'Error: Invalid amount - must be a positive number';
      }

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [to as Address, parseUnits(amount, 6)],
      });
      return `Transfer successful! TX: ${hash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Transfer failed: ${message}`;
    }
  }
}

class GetBlockInfoTool extends Tool {
  name = 'get_block_info';
  description = 'Get current block info on ARC Testnet. Input: (none)';
  
  private publicClient;
  
  constructor(publicClient: ReturnType<typeof createPublicClient>) {
    super();
    this.publicClient = publicClient;
  }

  async _call(): Promise<string> {
    try {
      const block = await this.publicClient.getBlock();
      return `Block: ${block.number}, Timestamp: ${block.timestamp}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Error: ${message}`;
    }
  }
}

class RegisterAgentTool extends Tool {
  name = 'register_agent';
  description = 'Register AI agent on ERC-8004. Input: metadataURI (string)';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(metadataURI: string): Promise<string> {
    try {
      if (!metadataURI || metadataURI.trim().length === 0) {
        return 'Error: metadataURI is required';
      }

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'register',
        args: [metadataURI],
      });
      return `Agent registered! TX: ${hash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Registration failed: ${message}`;
    }
  }
}

class CreateJobTool extends Tool {
  name = 'create_job';
  description = 'Create ERC-8183 job. Input: JSON {"provider": "0x...", "description": "...", "duration": 86400}';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { provider, description, duration = 86400 } = JSON.parse(input);

      if (!provider || !provider.startsWith('0x')) {
        return 'Error: Invalid provider address';
      }
      if (typeof duration !== 'number' || duration <= 0) {
        return 'Error: Invalid duration - must be positive number of seconds';
      }

      const expiredAt = Math.floor(Date.now() / 1000) + duration;
      
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: AGENTIC_COMMERCE,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJob',
        args: [
          provider as Address,
          this.account.address,
          BigInt(expiredAt),
          description || 'AI Agent Job',
          '0x0000000000000000000000000000000000000000' as Address,
        ],
      });
      return `Job created! TX: ${hash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Job creation failed: ${message}`;
    }
  }
}

// ============================================
// TREASURY TOOLS (Deposit, Schedule, Execute)
// ============================================

class DepositToTreasuryTool extends Tool {
  name = 'deposit_to_treasury';
  description = 'Deposit USDC to AgentTreasury contract. Input: JSON {"amount": "5"}';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { amount } = JSON.parse(input);
      const parsedAmount = parseUnits(amount, 6);
      
      // First approve
      const approveHash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [AGENT_TREASURY, parsedAmount],
      });
      
      // Then deposit
      const depositHash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: AGENT_TREASURY,
        abi: TREASURY_ABI,
        functionName: 'deposit',
        args: [parsedAmount],
      });
      
      return `Deposited ${amount} USDC to treasury! Approve TX: ${approveHash}, Deposit TX: ${depositHash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Deposit failed: ${message}`;
    }
  }
}

class SchedulePaymentTool extends Tool {
  name = 'schedule_payment';
  description = 'Schedule a recurring payment on treasury. Input: JSON {"recipient": "0x...", "amount": "10", "interval": 86400, "label": "Server hosting", "agentId": 1}';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { recipient, amount, interval = 0, maxExecutions = 0, label = 'Payment', agentId = 1 } = JSON.parse(input);
      
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: AGENT_TREASURY,
        abi: TREASURY_ABI,
        functionName: 'schedulePayment',
        args: [
          recipient as Address,
          parseUnits(amount, 6),
          BigInt(interval),
          BigInt(maxExecutions),
          label,
          BigInt(agentId),
        ],
      });
      
      return `Payment scheduled! TX: ${hash}. ${amount} USDC to ${recipient}, interval: ${interval}s, label: ${label}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Schedule payment failed: ${message}`;
    }
  }
}

class ExecutePaymentTool extends Tool {
  name = 'execute_payment';
  description = 'Execute a scheduled payment by ID. Input: paymentId (number)';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const paymentId = parseInt(input.trim());
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: AGENT_TREASURY,
        abi: TREASURY_ABI,
        functionName: 'executePayment',
        args: [BigInt(paymentId)],
      });
      return `Payment #${paymentId} executed! TX: ${hash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Execute payment failed: ${message}`;
    }
  }
}

class GetTreasuryInfoTool extends Tool {
  name = 'get_treasury_info';
  description = 'Get treasury contract info (balance, allocated, reserved, available). Input: (none)';
  
  private publicClient;
  
  constructor(publicClient: ReturnType<typeof createPublicClient>) {
    super();
    this.publicClient = publicClient;
  }

  async _call(): Promise<string> {
    try {
      const info = await this.publicClient.readContract({
        address: AGENT_TREASURY,
        abi: TREASURY_ABI,
        functionName: 'getTreasuryInfo',
      }) as unknown as { totalBalance: bigint; allocatedToAgents: bigint; reservedForPayments: bigint; available: bigint };
      
      return JSON.stringify({
        totalBalance: formatUnits(info.totalBalance, 6),
        allocatedToAgents: formatUnits(info.allocatedToAgents, 6),
        reservedForPayments: formatUnits(info.reservedForPayments, 6),
        available: formatUnits(info.available, 6),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Error: ${message}`;
    }
  }
}

class GetAgentInfoTool extends Tool {
  name = 'get_agent_info';
  description = 'Get agent details from treasury. Input: agentId (number)';
  
  private publicClient;
  
  constructor(publicClient: ReturnType<typeof createPublicClient>) {
    super();
    this.publicClient = publicClient;
  }

  async _call(input: string): Promise<string> {
    try {
      const agentId = parseInt(input.trim());
      const agent = await this.publicClient.readContract({
        address: AGENT_TREASURY,
        abi: TREASURY_ABI,
        functionName: 'getAgent',
        args: [BigInt(agentId)],
      }) as unknown as { agentId: bigint; owner: string; name: string; agentType: string; budget: bigint; spent: bigint; reputation: bigint; active: boolean; createdAt: bigint };
      
      return JSON.stringify({
        agentId: agent.agentId.toString(),
        owner: agent.owner,
        name: agent.name,
        agentType: agent.agentType,
        budget: formatUnits(agent.budget, 6),
        spent: formatUnits(agent.spent, 6),
        reputation: agent.reputation.toString(),
        active: agent.active,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Error: ${message}`;
    }
  }
}

class ApproveUSDCTool extends Tool {
  name = 'approve_usdc';
  description = 'Approve USDC spending. Input: JSON {"spender": "0x...", "amount": "100"}';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { spender, amount } = JSON.parse(input);
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [spender as Address, parseUnits(amount, 6)],
      });
      return `Approved ${amount} USDC for ${spender}! TX: ${hash}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Approve failed: ${message}`;
    }
  }
}

// ============================================
// TREASURY AGENT CLASS
// ============================================

export class TreasuryAgent {
  protected model: ChatOpenAI;
  private publicClient;
  private walletClient;
  private account;
  private tools: Tool[];
  private config: AgentConfig;
  private actionHistory: AgentAction[] = [];

  constructor(config: AgentConfig) {
    this.config = {
      maxActionsPerCycle: 3,
      balanceThreshold: '1.0',
      maxRetries: 3,
      retryDelayMs: 2000,
      ...config,
    };

    this.model = new ChatOpenAI({
      modelName: config.modelName || process.env.AI_MODEL_NAME || 'mimo-v2.5-pro',
      apiKey: config.apiKey || process.env.AI_API_KEY || 'dummy',
      temperature: 0.1,
      maxRetries: 2,
      configuration: {
        baseURL: config.apiBaseUrl || process.env.AI_API_BASE_URL || 'https://api.openai.com/v1',
      },
    });

    this.account = privateKeyToAccount(config.privateKey);
    
    this.publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      chain: arcTestnet,
      account: this.account,
      transport: http(),
    });

    this.tools = [
      // Core tools
      new CheckBalanceTool(this.publicClient),
      new TransferUSDCTool(this.walletClient, this.account),
      new GetBlockInfoTool(this.publicClient),
      new RegisterAgentTool(this.walletClient, this.account),
      new CreateJobTool(this.walletClient, this.account),
      // Treasury tools
      new DepositToTreasuryTool(this.walletClient, this.account),
      new SchedulePaymentTool(this.walletClient, this.account),
      new ExecutePaymentTool(this.walletClient, this.account),
      new GetTreasuryInfoTool(this.publicClient),
      new GetAgentInfoTool(this.publicClient),
      new ApproveUSDCTool(this.walletClient, this.account),
      // DeFi tools
      new CreateEscrowTool(this.walletClient, this.account),
      new RebalanceYieldTool(this.publicClient, this.walletClient, this.account),
      new ProcessPayrollTool(this.walletClient, this.account),
      new VerifyInvoiceTool(this.walletClient, this.account),
    ];
  }

  // ============================================
  // CONTEXT GATHERING (with retry)
  // ============================================

  async gatherContext(): Promise<AgentContext> {
    return withRetry(
      async () => {
        const balance = await this.publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [this.account.address],
        });

        return {
          address: this.account.address,
          balance,
          balanceFormatted: formatUnits(balance, 6),
          chainId: arcTestnet.id,
          network: arcTestnet.name,
          recentActions: this.actionHistory.slice(-10),
        };
      },
      {
        maxRetries: this.config.maxRetries ?? 3,
        delayMs: this.config.retryDelayMs ?? 2000,
        backoffMultiplier: 2,
        label: 'gatherContext',
      }
    );
  }

  // ============================================
  // AI ANALYSIS (with retry + fallback)
  // ============================================

  async analyze(context: AgentContext): Promise<AgentAction[]> {
    const systemPrompt = `You are ArcAgent Treasury, an autonomous AI agent managing USDC on ARC Network.

AVAILABLE TOOLS:
- check_balance: Check USDC balance. Input: "0x..." address
- transfer_usdc: Transfer USDC. Input: JSON {"to": "0x...", "amount": "10.5"}
- approve_usdc: Approve USDC spending. Input: JSON {"spender": "0x...", "amount": "100"}
- deposit_to_treasury: Deposit USDC to treasury contract. Input: JSON {"amount": "5"}
- get_treasury_info: Get treasury info (balance, allocated, reserved, available). Input: (none)
- get_agent_info: Get agent details. Input: agentId (number)
- schedule_payment: Schedule recurring payment. Input: JSON {"recipient": "0x...", "amount": "10", "interval": 86400, "label": "hosting", "agentId": 1}
- execute_payment: Execute scheduled payment. Input: paymentId (number)
- register_agent: Register on ERC-8004. Input: metadataURI (string)
- create_job: Create ERC-8183 job. Input: JSON {"provider": "0x...", "description": "...", "duration": 86400}
- create_escrow: Create USDC escrow. Input: JSON {"amount": "100", "recipient": "0x...", "taskId": "task-001"}
- rebalance_yield: Rebalance idle USDC to yield. Input: JSON {"threshold": "100"}
- process_payroll: Batch payroll. Input: JSON {"payments": [{"to": "0x...", "amount": "1000", "label": "salary"}]}
- verify_invoice: Verify invoice. Input: JSON {"invoiceId": "INV-001", "amount": "500", "vendor": "0x...", "description": "..."}
- get_block_info: Get current block. Input: (none)

CURRENT STATE:
- Wallet: ${context.address}
- Balance: ${context.balanceFormatted} USDC
- Network: ${context.network} (Chain ID: ${context.chainId})
- Recent actions: ${context.recentActions.length > 0 ? context.recentActions.map(a => a.type).join(', ') : 'none'}

SAFETY RULES:
1. ALWAYS check balance before any transfer
2. NEVER transfer more than 50% of balance
3. Keep at least 1 USDC as gas reserve
4. Auto-execute payments under 10 USDC
5. For payments > 100 USDC, recommend manual approval

You are an ACTIVE agent - execute actions, don't just recommend.
Return a JSON array of actions to execute. Each action: {"type": "tool_name", "params": {...}}
Execute up to ${this.config.maxActionsPerCycle} actions per cycle.`;

    const humanMessage = `Analyze the treasury and recommend actions now.`;

    try {
      const actions = await withRetry(
        async () => {
          const response = await this.model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(humanMessage),
          ]);

          const text = response.content as string;

          // Parse JSON from Claude response
          try {
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : JSON.parse(text);
            if (!Array.isArray(parsed)) {
              throw new Error('Response is not an array');
            }
            return parsed as AgentAction[];
          } catch (parseError) {
            console.warn('[TreasuryAgent] JSON parse failed, returning empty actions');
            return [] as AgentAction[];
          }
        },
        {
          maxRetries: this.config.maxRetries ?? 3,
          delayMs: this.config.retryDelayMs ?? 2000,
          backoffMultiplier: 2,
          label: 'analyze',
        }
      );

      return Array.isArray(actions) ? actions : [];
    } catch (error) {
      console.error('[TreasuryAgent] Analyze error after all retries:', error);
      // Fallback: return safe no-op action
      return [{
        type: 'check_balance',
        params: { address: context.address },
        success: false,
        timestamp: new Date().toISOString(),
        result: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }];
    }
  }

  // ============================================
  // EXECUTE ACTION VIA TOOLS (with retry)
  // ============================================

  async executeAction(action: AgentAction): Promise<AgentAction> {
    console.log(`[TreasuryAgent] Executing: ${action.type}`);

    try {
      const tool = this.tools.find(t => t.name === action.type);
      if (!tool) throw new Error(`Tool ${action.type} not found`);

      const input = action.params ? JSON.stringify(action.params) : '';

      const result = await withRetry(
        async () => tool.invoke(input),
        {
          maxRetries: this.config.maxRetries ?? 3,
          delayMs: this.config.retryDelayMs ?? 2000,
          backoffMultiplier: 2,
          label: `executeAction(${action.type})`,
        }
      );

      const executedAction: AgentAction = {
        ...action,
        result,
        success: !result.includes('failed') && !result.includes('Error') && !result.includes('error'),
        timestamp: new Date().toISOString(),
      };

      this.actionHistory.push(executedAction);
      return executedAction;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const failedAction: AgentAction = {
        ...action,
        result: `Execution failed after retries: ${message}`,
        success: false,
        timestamp: new Date().toISOString(),
      };
      this.actionHistory.push(failedAction);
      return failedAction;
    }
  }

  // ============================================
  // MAIN RUN CYCLE
  // ============================================

  async run(): Promise<AgentAction[]> {
    console.log(`[TreasuryAgent] 🚀 Starting treasury analysis cycle at ${new Date().toISOString()}`);

    try {
      const context = await this.gatherContext();
      console.log(`[TreasuryAgent] Balance: ${context.balanceFormatted} USDC`);

      const plannedActions = await this.analyze(context);
      const executed: AgentAction[] = [];
      const maxActions = this.config.maxActionsPerCycle || 3;

      for (const action of plannedActions.slice(0, maxActions)) {
        if (executed.length >= maxActions) break;

        // Safety guard
        if (action.type === 'transfer_usdc' && context.balance < parseUnits('1', 6)) {
          console.warn('[TreasuryAgent] Safety: Balance too low, skipping transfer');
          continue;
        }

        const result = await this.executeAction(action);
        executed.push(result);
      }

      console.log(`[TreasuryAgent] ✅ Cycle completed: ${executed.length} actions executed`);
      return executed;
    } catch (error) {
      console.error('[TreasuryAgent] ❌ Run cycle failed:', error);
      // Return a diagnostic action so caller knows what happened
      return [{
        type: 'get_block_info',
        params: {},
        success: false,
        timestamp: new Date().toISOString(),
        result: `Run cycle failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }];
    }
  }

  // ============================================
  // MODEL INVOCATION (for subclass use, with retry)
  // ============================================

  protected async callModel(systemPrompt: string, humanMessage: string): Promise<AgentAction[]> {
    try {
      return await withRetry(
        async () => {
          const response = await this.model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(humanMessage),
          ]);

          let actions: AgentAction[] = [];
          const text = response.content as string;

          try {
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
            actions = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : JSON.parse(text);
          } catch {
            actions = [];
          }

          return Array.isArray(actions) ? actions : [];
        },
        {
          maxRetries: this.config.maxRetries ?? 3,
          delayMs: this.config.retryDelayMs ?? 2000,
          backoffMultiplier: 2,
          label: 'callModel',
        }
      );
    } catch (error) {
      console.error('[TreasuryAgent] callModel error after retries:', error);
      return [];
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  getActionHistory(): AgentAction[] {
    return [...this.actionHistory];
  }

  getAgentAddress(): Address {
    return this.account.address;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}
