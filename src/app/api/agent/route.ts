import { NextRequest, NextResponse } from 'next/server';
import { TreasuryAgent } from '@/agent/TreasuryAgent';

export async function POST(request: NextRequest) {
  try {
    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
    
    if (!privateKey || privateKey === '0x') {
      return NextResponse.json(
        { error: 'Agent private key not configured' },
        { status: 500 }
      );
    }

    const agent = new TreasuryAgent(privateKey);
    const results = await agent.run();

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Agent API] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'ArcAgent Treasury Agent',
    version: '1.0.0',
    network: 'ARC Testnet',
    chainId: 5042002,
    capabilities: [
      'check_balance',
      'transfer',
      'schedule_payment',
      'create_job',
      'register_agent',
      'rebalance',
    ],
  });
}
