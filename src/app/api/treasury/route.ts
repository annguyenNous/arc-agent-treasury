/**
 * REST API for ArcAgent Treasury
 * Monitoring and control endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { TreasuryAgent } from '@/agent/TreasuryAgent';
import { PortfolioManager } from '@/agent/portfolio';
import { loadConfig } from '@/agent/config';
import { Logger } from '@/agent/logger';

const log = new Logger('api');

// Global agent instance
let agent: TreasuryAgent | null = null;
let portfolioManager: PortfolioManager | null = null;

// ============================================
// GET: Health Check
// ============================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'health':
        return NextResponse.json({
          status: 'ok',
          agent: agent ? 'running' : 'stopped',
          timestamp: new Date().toISOString(),
        });

      case 'portfolio':
        if (!portfolioManager) {
          return NextResponse.json({ error: 'Agent not initialized' }, { status: 503 });
        }
        const portfolio = await portfolioManager.getFullPortfolio();
        return NextResponse.json({ portfolio });

      case 'config':
        const config = await loadConfig();
        return NextResponse.json({ config });

      case 'status':
        return NextResponse.json({
          agent: agent ? 'initialized' : 'offline',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({
          name: 'ArcAgent Treasury API',
          version: '1.0.0',
          endpoints: ['health', 'portfolio', 'config', 'status'],
        });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('API error', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================
// POST: Control Actions
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
    
    if (!privateKey || privateKey === '0x') {
      return NextResponse.json(
        { error: 'AGENT_PRIVATE_KEY not configured' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'init': {
        // Initialize agent
        agent = new TreasuryAgent({
          privateKey,
          maxActionsPerCycle: 3,
          balanceThreshold: '1.0',
        });
        
        // Initialize portfolio manager
        const { createPublicClient, http } = await import('viem');
        const { arcTestnet } = await import('@/config/chains');
        const { privateKeyToAccount } = await import('viem/accounts');
        
        const account = privateKeyToAccount(privateKey);
        portfolioManager = new PortfolioManager(account.address);
        
        log.info('Agent initialized', { address: account.address });
        
        return NextResponse.json({
          success: true,
          action: 'init',
          address: account.address,
        });
      }

      case 'run': {
        if (!agent) {
          return NextResponse.json({ error: 'Agent not initialized' }, { status: 503 });
        }
        
        const results = await agent.run();
        return NextResponse.json({
          success: true,
          action: 'run',
          results,
        });
      }

      case 'snapshot': {
        if (!portfolioManager) {
          return NextResponse.json({ error: 'Agent not initialized' }, { status: 503 });
        }
        
        const snapshot = await portfolioManager.getFullPortfolio();
        return NextResponse.json({
          success: true,
          action: 'snapshot',
          snapshot,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('API error', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
