import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Tool } from '@langchain/core/tools';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, USDC_ADDRESS, AGENTIC_COMMERCE, IDENTITY_REGISTRY, REPUTATION_REGISTRY } from '../config/chains';
import { USDC_ABI, AGENTIC_COMMERCE_ABI, IDENTITY_REGISTRY_ABI, REPUTATION_ABI } from '../contracts/abis';
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
  balanceThreshold?: string;
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
      maxActionsPerCycle: 3,
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
      // New tools from Circle + TreasuryPilot patterns
      new CreateEscrowTool(this.walletClient, this.account),
      new RebalanceYieldTool(this.publicClient, this.walletClient, this.account),
      new ProcessPayrollTool(this.walletClient, this.account),
      new VerifyInvoiceTool(this.walletClient, this.account),
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
    const systemPrompt = `Bạn là ArcAgent Treasury, AI agent quản lý USDC trên ARC Network.

TOOLS CÓ SẴN:
- check_balance: Kiểm tra số dư USDC. Input: address (0x...)
- transfer_usdc: Chuyển USDC. Input: JSON {"to": "0x...", "amount": "10.5"}
- register_agent: Đăng ký agent ERC-8004. Input: metadataURI (string)
- create_job: Tạo job ERC-8183. Input: JSON {"provider": "0x...", "description": "...", "duration": 86400}
- get_block_info: Lấy thông tin block hiện tại. Input: (none)

TRẠNG THÁI HIỆN TẠI:
- Wallet: ${context.address}
- Balance: ${context.balanceFormatted} USDC
- Network: ${context.network} (Chain ID: ${context.chainId})

QUY TẮC AN TOÀN:
1. KHÔNG chuyển nếu balance < 1 USDC
2. KHÔNG chuyển quá 50% balance
3. Luôn check balance trước khi transfer

Trả về array actions tối đa 3 actions, mỗi action có:
{
  "type": "check_balance" | "transfer_usdc" | "register_agent" | "create_job" | "get_block_info",
  "params": { ... }
}`;

    const humanMessage = `Phân tích treasury và đề xuất actions ngay bây giờ.`;

    try {
      const response = await this.model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(humanMessage),
      ]);

      // Parse JSON từ Claude
      let actions: AgentAction[] = [];
      const text = response.content as string;

      try {
        // Claude đôi khi trả JSON trong ```json
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
        actions = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : JSON.parse(text);
      } catch {
        actions = [];
      }

      return Array.isArray(actions) ? actions : [];
    } catch (error) {
      console.error('[TreasuryAgent] Analyze error:', error);
      return [];
    }
  }

  // ============================================
  // EXECUTE ACTION VIA TOOLS
  // ============================================

  async executeAction(action: AgentAction): Promise<AgentAction> {
    console.log(`[TreasuryAgent] Executing: ${action.type}`);

    try {
      // LangChain tool call
      const tool = this.tools.find(t => t.name === action.type);
      if (!tool) throw new Error(`Tool ${action.type} not found`);

      const input = action.params ? JSON.stringify(action.params) : '';
      const result = await tool.invoke(input);

      const executedAction: AgentAction = {
        ...action,
        result,
        success: result.includes('successful') || result.includes('registered') || result.includes('created'),
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
  // MAIN RUN CYCLE
  // ============================================

  async run(): Promise<AgentAction[]> {
    console.log(`[TreasuryAgent] 🚀 Starting treasury analysis cycle at ${new Date().toISOString()}`);

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
}
