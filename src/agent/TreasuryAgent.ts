import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Tool } from '@langchain/core/tools';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, USDC_ADDRESS, AGENTIC_COMMERCE, IDENTITY_REGISTRY, REPUTATION_REGISTRY } from '../config/chains';
import { USDC_ABI, AGENTIC_COMMERCE_ABI, IDENTITY_REGISTRY_ABI, REPUTATION_ABI } from '../contracts/abis';

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
  maxActionsPerCycle?: number;
  balanceThreshold?: string; // Minimum USDC balance to allow transfers
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

  async _call(address: string): Promise<string> {
    try {
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
  description = 'Get current block info on ARC Testnet';
  
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
  description = 'Register AI agent on ERC-8004. Input: metadataURI';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(metadataURI: string): Promise<string> {
    try {
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
// TREASURY AGENT CLASS
// ============================================

export class TreasuryAgent {
  private model: ChatAnthropic;
  private publicClient;
  private walletClient;
  private account;
  private tools: Tool[];
  private config: AgentConfig;
  private actionHistory: AgentAction[] = [];

  constructor(config: AgentConfig) {
    this.config = {
      maxActionsPerCycle: 5,
      balanceThreshold: '1.0',
      ...config,
    };

    this.model = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      anthropicApiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
      temperature: 0.1,
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
      new CheckBalanceTool(this.publicClient),
      new TransferUSDCTool(this.walletClient, this.account),
      new GetBlockInfoTool(this.publicClient),
      new RegisterAgentTool(this.walletClient, this.account),
      new CreateJobTool(this.walletClient, this.account),
    ];
  }

  // ============================================
  // CONTEXT GATHERING
  // ============================================

  async gatherContext(): Promise<AgentContext> {
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
  }

  // ============================================
  // AI ANALYSIS
  // ============================================

  async analyze(context: AgentContext): Promise<AgentAction[]> {
    const systemPrompt = `You are ArcAgent Treasury, an autonomous AI agent managing USDC treasury on ARC Network.

CAPABILITIES:
- check_balance: Check USDC balance of any address
- transfer_usdc: Transfer USDC to recipients
- register_agent: Register new AI agents on ERC-8004
- create_job: Create ERC-8183 jobs for other agents
- get_block_info: Get current blockchain state

CURRENT STATE:
- Wallet: ${context.address}
- Balance: ${context.balanceFormatted} USDC
- Network: ${context.network} (Chain ID: ${context.chainId})
- Threshold: ${this.config.balanceThreshold} USDC minimum

SAFETY RULES:
1. NEVER transfer if balance < ${this.config.balanceThreshold} USDC
2. NEVER transfer more than 50% of balance in one action
3. Always check balance before transfers
4. Prefer small test transfers first

Respond with a JSON array of actions. Each action:
{"type": "tool_name", "params": {...}, "reason": "why"}

If no action needed, return: []`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Analyze treasury state and recommend actions.
        
Time: ${new Date().toISOString()}
Balance: ${context.balanceFormatted} USDC
Recent: ${JSON.stringify(context.recentActions.slice(-3))}`),
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const actions = JSON.parse(jsonMatch[0]);
        return actions.map((a: Record<string, unknown>) => ({
          ...a,
          success: false,
          timestamp: new Date().toISOString(),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('[TreasuryAgent] Analysis failed:', error);
      return [];
    }
  }

  // ============================================
  // ACTION EXECUTION
  // ============================================

  async executeAction(action: AgentAction): Promise<AgentAction> {
    console.log(`[TreasuryAgent] Executing: ${action.type}`);
    
    try {
      let result: string;
      let txHash: Hash | undefined;

      switch (action.type) {
        case 'check_balance': {
          const balance = await this.publicClient.readContract({
            address: USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: 'balanceOf',
            args: [action.params.address as Address],
          });
          result = `Balance: ${formatUnits(balance, 6)} USDC`;
          break;
        }

        case 'transfer_usdc': {
          const { to, amount } = action.params;
          txHash = await this.walletClient.writeContract({
            chain: arcTestnet,
            account: this.account,
            address: USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [to as Address, parseUnits(amount as string, 6)],
          });
          result = `Transferred ${amount} USDC to ${to}`;
          break;
        }

        case 'register_agent': {
          const { metadataURI } = action.params;
          txHash = await this.walletClient.writeContract({
            chain: arcTestnet,
            account: this.account,
            address: IDENTITY_REGISTRY,
            abi: IDENTITY_REGISTRY_ABI,
            functionName: 'register',
            args: [metadataURI as string],
          });
          result = `Agent registered`;
          break;
        }

        case 'create_job': {
          const { provider, description, duration = 86400 } = action.params;
          const expiredAt = Math.floor(Date.now() / 1000) + (duration as number);
          txHash = await this.walletClient.writeContract({
            chain: arcTestnet,
            account: this.account,
            address: AGENTIC_COMMERCE,
            abi: AGENTIC_COMMERCE_ABI,
            functionName: 'createJob',
            args: [
              provider as Address,
              this.account.address,
              BigInt(expiredAt),
              (description as string) || 'AI Agent Job',
              '0x0000000000000000000000000000000000000000' as Address,
            ],
          });
          result = `Job created: ${description}`;
          break;
        }

        case 'get_block_info': {
          const block = await this.publicClient.getBlock();
          result = `Block: ${block.number}, Timestamp: ${block.timestamp}`;
          break;
        }

        default:
          result = `Unknown action: ${action.type}`;
      }

      const executedAction: AgentAction = {
        ...action,
        result,
        txHash,
        success: true,
        timestamp: new Date().toISOString(),
      };

      this.actionHistory.push(executedAction);
      return executedAction;

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const failedAction: AgentAction = {
        ...action,
        result: `Execution failed: ${message}`,
        success: false,
        timestamp: new Date().toISOString(),
      };
      this.actionHistory.push(failedAction);
      return failedAction;
    }
  }

  // ============================================
  // MAIN RUN CYCLE WITH SAFETY CHECKS
  // ============================================

  async run(): Promise<AgentAction[]> {
    console.log('[TreasuryAgent] Starting analysis cycle...');
    const startTime = Date.now();
    
    // 1. Gather context
    const context = await this.gatherContext();
    console.log(`[TreasuryAgent] Balance: ${context.balanceFormatted} USDC`);

    // 2. AI analysis
    const plannedActions = await this.analyze(context);
    console.log(`[TreasuryAgent] AI recommended ${plannedActions.length} actions`);

    // 3. Execute with safety checks
    const executed: AgentAction[] = [];
    const maxActions = this.config.maxActionsPerCycle || 5;
    const minBalance = parseUnits(this.config.balanceThreshold || '1.0', 6);

    for (const action of plannedActions.slice(0, maxActions)) {
      if (executed.length >= maxActions) break;

      // Safety check: balance too low for transfers
      if (action.type === 'transfer_usdc' && context.balance < minBalance) {
        console.warn('[TreasuryAgent] Safety: Balance too low for transfer, skipping');
        executed.push({
          ...action,
          result: 'Skipped: Balance below threshold',
          success: false,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Safety check: don't transfer more than 50% of balance
      if (action.type === 'transfer_usdc') {
        const amount = parseUnits((action.params.amount as string) || '0', 6);
        if (amount > context.balance / BigInt(2)) {
          console.warn('[TreasuryAgent] Safety: Transfer amount exceeds 50% of balance');
          executed.push({
            ...action,
            result: 'Skipped: Amount exceeds 50% of balance',
            success: false,
            timestamp: new Date().toISOString(),
          });
          continue;
        }
      }

      const result = await this.executeAction(action);
      executed.push(result);
    }

    const duration = Date.now() - startTime;
    console.log(`[TreasuryAgent] Cycle completed: ${executed.length} actions in ${duration}ms`);
    
    return executed;
  }

  // ============================================
  // GETTERS
  // ============================================

  getAddress(): Address {
    return this.account.address;
  }

  getActionHistory(): AgentAction[] {
    return [...this.actionHistory];
  }

  getCurrentContext(): Promise<AgentContext> {
    return this.gatherContext();
  }

  getTools(): Tool[] {
    return [...this.tools];
  }
}
