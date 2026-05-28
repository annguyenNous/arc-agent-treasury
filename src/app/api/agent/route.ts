import { NextRequest, NextResponse } from 'next/server';
import { TreasuryAgent } from '@/agent/TreasuryAgent';
import { getCronManager, startTreasuryCron } from '@/agent/CronManager';
import { validateApiKey } from '@/app/api/middleware';
import { checkRateLimit } from '@/app/api/rate-limit';

// ============================================
// GET: Agent Status (public)
// ============================================

export async function GET(request: NextRequest) {
  // Rate limit all requests including GET
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  try {
    const manager = getCronManager();
    const jobs = manager.getAllJobs();

    return NextResponse.json({
      name: 'ArcAgent Treasury',
      version: '1.0.0',
      network: 'ARC Testnet',
      chainId: 5042002,
      capabilities: [
        'check_balance',
        'transfer_usdc',
        'register_agent',
        'create_job',
        'get_block_info',
      ],
      activeJobs: jobs.length,
      jobs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================
// POST: Trigger Agent or Start Cron (authenticated)
// ============================================

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response;
  }

  // Authenticate
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { action, intervalMinutes, maxRuns } = body;

    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
    
    if (!privateKey || privateKey === '0x') {
      return NextResponse.json(
        { error: 'AGENT_PRIVATE_KEY not configured in .env.local' },
        { status: 500 }
      );
    }

    switch (action) {
      case 'run': {
        // Run agent once
        const agent = new TreasuryAgent({ privateKey });
        const results = await agent.run();
        
        return NextResponse.json({
          success: true,
          action: 'run',
          results,
          timestamp: new Date().toISOString(),
        });
      }

      case 'start_cron': {
        // Start cron job
        const manager = startTreasuryCron(privateKey, {
          intervalMinutes: intervalMinutes || 5,
          maxRuns: maxRuns,
        });

        return NextResponse.json({
          success: true,
          action: 'start_cron',
          intervalMinutes: intervalMinutes || 5,
          maxRuns,
          timestamp: new Date().toISOString(),
        });
      }

      case 'stop_cron': {
        // Stop cron job
        const manager = getCronManager();
        manager.stopAll();

        return NextResponse.json({
          success: true,
          action: 'stop_cron',
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: run, start_cron, stop_cron` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Agent API] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
