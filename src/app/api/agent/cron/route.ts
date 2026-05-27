import { NextRequest, NextResponse } from 'next/server';
import { TreasuryAgent } from '@/agent/TreasuryAgent';

// This endpoint can be called by a cron service (e.g., Vercel Cron, external cron)
export async function GET(request: NextRequest) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
    
    if (!privateKey || privateKey === '0x') {
      return NextResponse.json(
        { error: 'AGENT_PRIVATE_KEY not configured' },
        { status: 500 }
      );
    }

    const agent = new TreasuryAgent({
      privateKey,
      maxActionsPerCycle: 3,
    });
    
    const results = await agent.run();

    return NextResponse.json({
      success: true,
      results,
      executedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
