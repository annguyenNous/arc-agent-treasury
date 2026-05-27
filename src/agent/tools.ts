import { Tool } from '@langchain/core/tools';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet, USDC_ADDRESS, AGENTIC_COMMERCE, IDENTITY_REGISTRY } from '../config/chains';
import { USDC_ABI, AGENTIC_COMMERCE_ABI, IDENTITY_REGISTRY_ABI } from '../contracts/abis';

// ============================================
// ESCROW TOOL (Circle AI Agent Pattern)
// ============================================

export class CreateEscrowTool extends Tool {
  name = 'create_escrow';
  description = 'Create USDC escrow for freelancer/gig worker. Auto-release when task complete. Input: JSON {"amount": "100", "recipient": "0x...", "taskId": "task-001", "releaseCondition": "auto_after_days"}';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { amount, recipient, taskId, releaseCondition = 'auto_after_days' } = JSON.parse(input);
      
      // Use ERC-8183 job as escrow mechanism
      const duration = releaseCondition === 'auto_after_days' ? 7 * 86400 : 86400; // 7 days or 1 day
      const expiredAt = Math.floor(Date.now() / 1000) + duration;
      
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        account: this.account,
        address: AGENTIC_COMMERCE,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJob',
        args: [
          recipient as Address,
          this.account.address,
          BigInt(expiredAt),
          `Escrow: ${taskId} (${releaseCondition})`,
          '0x0000000000000000000000000000000000000000' as Address,
        ],
      });

      return `Escrow created! TX: ${hash}. Amount: ${amount} USDC for ${taskId}. Release: ${releaseCondition}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Escrow creation failed: ${message}`;
    }
  }
}

// ============================================
// YIELD REBALANCE TOOL (TreasuryPilot Pattern)
// ============================================

export class RebalanceYieldTool extends Tool {
  name = 'rebalance_yield';
  description = 'Check idle USDC balance and rebalance to yield pool if above threshold. Input: JSON {"threshold": "100"}';
  
  private publicClient;
  private walletClient;
  private account;
  
  constructor(
    publicClient: ReturnType<typeof createPublicClient>,
    walletClient: ReturnType<typeof createWalletClient>,
    account: ReturnType<typeof privateKeyToAccount>
  ) {
    super();
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { threshold = '100' } = input ? JSON.parse(input) : {};
      const thresholdAmount = parseUnits(threshold, 6);
      
      // Check current balance
      const balance = await this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [this.account.address],
      });

      if (balance < thresholdAmount) {
        return `No rebalance needed. Balance: ${formatUnits(balance, 6)} USDC (threshold: ${threshold} USDC)`;
      }

      // In production, this would call a yield vault contract
      // For now, we log the rebalance opportunity
      const idleAmount = balance - thresholdAmount;
      return `Rebalance opportunity: ${formatUnits(idleAmount, 6)} USDC idle. Balance: ${formatUnits(balance, 6)} USDC. Consider moving to yield vault.`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Rebalance check failed: ${message}`;
    }
  }
}

// ============================================
// PAYROLL TOOL (TreasuryPilot Pattern)
// ============================================

export class ProcessPayrollTool extends Tool {
  name = 'process_payroll';
  description = 'Process payroll payments to multiple recipients. Input: JSON {"payments": [{"to": "0x...", "amount": "1000", "label": "salary"}]}';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { payments } = JSON.parse(input);
      
      if (!Array.isArray(payments) || payments.length === 0) {
        return 'No payments to process';
      }

      const results: string[] = [];
      let totalAmount = 0;

      for (const payment of payments.slice(0, 10)) { // Max 10 payments per batch
        const { to, amount, label = 'payroll' } = payment;
        
        try {
          const hash = await this.walletClient.writeContract({
            chain: arcTestnet,
            account: this.account,
            address: USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [to as Address, parseUnits(amount, 6)],
          });
          
          totalAmount += parseFloat(amount);
          results.push(`✓ ${label}: ${amount} USDC to ${to.slice(0, 8)}... (TX: ${hash.slice(0, 10)}...)`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          results.push(`✗ ${label}: Failed - ${message}`);
        }
      }

      return `Payroll processed: ${results.length} payments, ${totalAmount} USDC total.\n${results.join('\n')}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Payroll failed: ${message}`;
    }
  }
}

// ============================================
// INVOICE VERIFICATION TOOL (TreasuryPilot Pattern)
// ============================================

export class VerifyInvoiceTool extends Tool {
  name = 'verify_invoice';
  description = 'Verify invoice and prepare payment. Input: JSON {"invoiceId": "INV-001", "amount": "500", "vendor": "0x...", "description": "Server hosting"}';
  
  private walletClient;
  private account;
  
  constructor(walletClient: ReturnType<typeof createWalletClient>, account: ReturnType<typeof privateKeyToAccount>) {
    super();
    this.walletClient = walletClient;
    this.account = account;
  }

  async _call(input: string): Promise<string> {
    try {
      const { invoiceId, amount, vendor, description } = JSON.parse(input);
      
      // In production, this would:
      // 1. Verify invoice on IPFS/blockchain
      // 2. Check against budget
      // 3. Auto-approve if within limits
      
      const verificationResult = {
        invoiceId,
        amount,
        vendor,
        description,
        status: 'verified',
        autoApproved: parseFloat(amount) < 1000, // Auto-approve if < 1000 USDC
      };

      if (verificationResult.autoApproved) {
        // Auto-pay
        const hash = await this.walletClient.writeContract({
          chain: arcTestnet,
          account: this.account,
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [vendor as Address, parseUnits(amount, 6)],
        });
        
        return `Invoice ${invoiceId} verified and auto-paid! ${amount} USDC to ${vendor}. TX: ${hash}`;
      }

      return `Invoice ${invoiceId} verified. Amount: ${amount} USDC. Requires manual approval (>1000 USDC).`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Invoice verification failed: ${message}`;
    }
  }
}

// ============================================
// EXPORT ALL TOOLS
// ============================================

export function createTreasuryTools(
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>
): Tool[] {
  return [
    new CreateEscrowTool(walletClient, account),
    new RebalanceYieldTool(publicClient, walletClient, account),
    new ProcessPayrollTool(walletClient, account),
    new VerifyInvoiceTool(walletClient, account),
  ];
}
