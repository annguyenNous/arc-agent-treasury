/**
 * Portfolio Manager for ArcAgent Treasury
 * Reads and formats portfolio state for AI analysis
 */

import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { arcTestnet, USDC_ADDRESS } from '../config/chains';
import { USDC_ABI } from '../contracts/abis';
import { Logger } from './logger';

const log = new Logger('portfolio');

export interface TokenBalance {
  symbol: string;
  balance: string;
  balanceRaw: bigint;
  decimals: number;
  address: string;
}

export interface ChainPortfolio {
  chain: string;
  chainId: number;
  address: string;
  native: {
    symbol: string;
    balance: string;
  };
  tokens: Record<string, TokenBalance>;
  totalValueUSDC: string;
}

export interface PortfolioSnapshot {
  timestamp: string;
  chains: Record<string, ChainPortfolio>;
  totalValueUSDC: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Token registry for ARC Testnet
const TOKENS: Record<string, Record<string, { address: string; decimals: number }>> = {
  arcTestnet: {
    USDC: { address: USDC_ADDRESS, decimals: 6 },
  },
};

export class PortfolioManager {
  private publicClient;
  private address: Address;

  constructor(address: Address) {
    this.address = address;
    this.publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });
  }

  async getTokenBalance(chain: string, symbol: string): Promise<TokenBalance> {
    const token = TOKENS[chain]?.[symbol];
    if (!token) {
      return { symbol, balance: '0', balanceRaw: BigInt(0), decimals: 6, address: '' };
    }

    try {
      const raw = await this.publicClient.readContract({
        address: token.address as Address,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [this.address],
      });

      return {
        symbol,
        balance: formatUnits(raw, token.decimals),
        balanceRaw: raw,
        decimals: token.decimals,
        address: token.address,
      };
    } catch (error) {
      log.warn(`Failed to get ${symbol} balance`, { error: (error as Error).message });
      return { symbol, balance: '0', balanceRaw: BigInt(0), decimals: token.decimals, address: token.address };
    }
  }

  async getChainPortfolio(chain: string): Promise<ChainPortfolio> {
    const tokens: Record<string, TokenBalance> = {};
    
    for (const symbol of Object.keys(TOKENS[chain] || {})) {
      tokens[symbol] = await this.getTokenBalance(chain, symbol);
    }

    const usdcBalance = tokens['USDC']?.balanceRaw || BigInt(0);
    const totalValueUSDC = formatUnits(usdcBalance, 6);

    return {
      chain,
      chainId: arcTestnet.id,
      address: this.address,
      native: { symbol: 'USDC', balance: totalValueUSDC },
      tokens,
      totalValueUSDC,
    };
  }

  async getFullPortfolio(): Promise<PortfolioSnapshot> {
    log.info('Reading portfolio state', { address: this.address });

    const chains: Record<string, ChainPortfolio> = {};
    let totalValue = BigInt(0);

    for (const chain of Object.keys(TOKENS)) {
      chains[chain] = await this.getChainPortfolio(chain);
      totalValue += chains[chain].tokens['USDC']?.balanceRaw || BigInt(0);
    }

    const totalValueUSDC = formatUnits(totalValue, 6);
    const riskLevel = this.assessRisk(totalValue);

    log.info('Portfolio snapshot complete', {
      totalValueUSDC,
      riskLevel,
      chains: Object.keys(chains).length,
    });

    return {
      timestamp: new Date().toISOString(),
      chains,
      totalValueUSDC,
      riskLevel,
    };
  }

  private assessRisk(totalValue: bigint): 'low' | 'medium' | 'high' {
    const value = Number(formatUnits(totalValue, 6));
    if (value < 10) return 'high';
    if (value < 100) return 'medium';
    return 'low';
  }

  formatForAI(snapshot: PortfolioSnapshot): string {
    const lines: string[] = [];
    
    for (const [chain, data] of Object.entries(snapshot.chains)) {
      lines.push(`\n[${chain.toUpperCase()}] Address: ${data.address}`);
      lines.push(`  USDC: ${data.native.balance}`);
      
      for (const [symbol, token] of Object.entries(data.tokens)) {
        if (symbol !== 'USDC') {
          lines.push(`  ${symbol}: ${token.balance}`);
        }
      }
    }

    lines.push(`\nTotal Value: ${snapshot.totalValueUSDC} USDC`);
    lines.push(`Risk Level: ${snapshot.riskLevel}`);

    return lines.join('\n');
  }
}
