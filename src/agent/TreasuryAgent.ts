import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, USDC_ADDRESS, AGENTIC_COMMERCE, IDENTITY_REGISTRY, REPUTATION_REGISTRY } from '../config/chains';
import { USDC_ABI, AGENTIC_COMMERCE_ABI, IDENTITY_REGISTRY_ABI } from '../contracts/abis';

// ============================================
// TYPES
// ============================================

interface AgentAction {
  type: 'transfer' | 'schedule_payment' | 'create_job' | 'register_agent' | 'check_balance' | 'rebalance';
  params: Record<string, any>;
  result?: string;
  txHash?: string;
}

interface AgentContext {
  address: string;
  balance: bigint;
  agents: any[];
  payments: any[];
}

// ============================================
// TREASURY AGENT
// ============================================

export class TreasuryAgent {
  private model: ChatAnthropic;
  private publicClient;
  private walletClient;
  private account;

  constructor(privateKey: `0x${string}`) {
    this.model = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.account = privateKeyToAccount(privateKey);
    
    this.publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: arcTestnet,
      transport: http(),
    });
  }

  // ============================================
  // CORE AGENT LOOP
  // ============================================

  async analyze(context: AgentContext): Promise<AgentAction[]> {
    const systemPrompt = `You are an AI Treasury Manager on ARC Network (Chain ID: 5042002).

Your capabilities:
1. Check USDC balance
2. Transfer USDC to recipients
3. Schedule recurring payments
4. Create ERC-8183 jobs for other AI agents
5. Register agents on ERC-8004 identity registry
6. Rebalance treasury allocations

Current Context:
- Wallet: ${context.address}
- USDC Balance: ${formatUnits(context.balance, 6)} USDC
- Active Agents: ${context.agents.length}
- Scheduled Payments: ${context.payments.length}

Rules:
- Always verify sufficient balance before transfers
- Use sub-second finality for real-time operations
- Prefer scheduled payments for recurring expenses
- Monitor agent reputation and adjust budgets

Respond with a JSON array of actions to take. Each action should have:
- type: one of the above capabilities
- params: parameters for the action

Example response:
[{"type": "check_balance", "params": {"address": "0x..."}}]`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify({
        task: 'Analyze treasury status and recommend actions',
        context: context,
        timestamp: new Date().toISOString(),
      })),
    ];

    const response = await this.model.invoke(messages);
    
    try {
      // Parse actions from AI response
      const content = response.content as string;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.error('Failed to parse agent actions:', error);
      return [];
    }
  }

  // ============================================
  // ACTION EXECUTORS
  // ============================================

  async executeAction(action: AgentAction): Promise<AgentAction> {
    switch (action.type) {
      case 'check_balance':
        return this.checkBalance(action);
      case 'transfer':
        return this.transferUSDC(action);
      case 'schedule_payment':
        return this.schedulePayment(action);
      case 'create_job':
        return this.createJob(action);
      case 'register_agent':
        return this.registerAgent(action);
      default:
        return { ...action, result: 'Unknown action type' };
    }
  }

  private async checkBalance(action: AgentAction): Promise<AgentAction> {
    const balance = await this.publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [action.params.address as `0x${string}`],
    });

    return {
      ...action,
      result: `Balance: ${formatUnits(balance, 6)} USDC`,
    };
  }

  private async transferUSDC(action: AgentAction): Promise<AgentAction> {
    try {
      const hash = await this.walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [
          action.params.to as `0x${string}`,
          parseUnits(action.params.amount.toString(), 6),
        ],
      });

      return {
        ...action,
        result: `Transfer successful`,
        txHash: hash,
      };
    } catch (error: any) {
      return {
        ...action,
        result: `Transfer failed: ${error.message}`,
      };
    }
  }

  private async schedulePayment(action: AgentAction): Promise<AgentAction> {
    // Implementation for scheduling payments
    return {
      ...action,
      result: 'Payment scheduled',
    };
  }

  private async createJob(action: AgentAction): Promise<AgentAction> {
    try {
      const expiredAt = Math.floor(Date.now() / 1000) + (action.params.duration || 86400);
      
      const hash = await this.walletClient.writeContract({
        address: AGENTIC_COMMERCE,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJob',
        args: [
          action.params.provider as `0x${string}`,
          this.account.address,
          BigInt(expiredAt),
          action.params.description || 'AI Agent Job',
          '0x0000000000000000000000000000000000000000',
        ],
      });

      return {
        ...action,
        result: 'Job created',
        txHash: hash,
      };
    } catch (error: any) {
      return {
        ...action,
        result: `Job creation failed: ${error.message}`,
      };
    }
  }

  private async registerAgent(action: AgentAction): Promise<AgentAction> {
    try {
      const hash = await this.walletClient.writeContract({
        address: IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'register',
        args: [action.params.metadataURI || 'ipfs://default-metadata'],
      });

      return {
        ...action,
        result: 'Agent registered on ERC-8004',
        txHash: hash,
      };
    } catch (error: any) {
      return {
        ...action,
        result: `Registration failed: ${error.message}`,
      };
    }
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
      agents: [], // Would fetch from contract
      payments: [], // Would fetch from contract
    };
  }

  // ============================================
  // FULL AGENT CYCLE
  // ============================================

  async run(): Promise<AgentAction[]> {
    console.log('[TreasuryAgent] Starting analysis cycle...');
    
    // Gather context
    const context = await this.gatherContext();
    console.log('[TreasuryAgent] Context gathered:', {
      address: context.address,
      balance: formatUnits(context.balance, 6),
    });

    // Analyze with AI
    const actions = await this.analyze(context);
    console.log('[TreasuryAgent] AI recommended', actions.length, 'actions');

    // Execute actions
    const results: AgentAction[] = [];
    for (const action of actions) {
      console.log('[TreasuryAgent] Executing:', action.type);
      const result = await this.executeAction(action);
      results.push(result);
    }

    return results;
  }
}
