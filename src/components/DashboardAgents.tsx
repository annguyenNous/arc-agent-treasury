'use client';

import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { AGENT_TREASURY, IDENTITY_REGISTRY, EXPLORER_URL } from '@/config/chains';
import { TREASURY_ABI } from '@/hooks/useAgentTreasury';
import AgentCard from '@/components/AgentCard';

interface RecentIdentity {
  hash: string;
  from: string;
  timestamp: string;
}

export default function DashboardAgents() {
  const [recentIdentities, setRecentIdentities] = useState<RecentIdentity[]>([]);

  // Read on-chain agent count from treasury
  const { data: agentCount } = useReadContract({
    address: AGENT_TREASURY,
    abi: TREASURY_ABI,
    functionName: 'agentCount',
  });
  const count = agentCount ? Number(agentCount) : 0;

  // Read first 3 agents from treasury
  const { data: agent1 } = useReadContract({
    address: AGENT_TREASURY,
    abi: TREASURY_ABI,
    functionName: 'agents',
    args: count >= 1 ? [BigInt(1)] : undefined,
    query: { enabled: count >= 1 },
  });
  const { data: agent2 } = useReadContract({
    address: AGENT_TREASURY,
    abi: TREASURY_ABI,
    functionName: 'agents',
    args: count >= 2 ? [BigInt(2)] : undefined,
    query: { enabled: count >= 2 },
  });
  const { data: agent3 } = useReadContract({
    address: AGENT_TREASURY,
    abi: TREASURY_ABI,
    functionName: 'agents',
    args: count >= 3 ? [BigInt(3)] : undefined,
    query: { enabled: count >= 3 },
  });

  // Fetch recent ERC-8004 registrations
  useEffect(() => {
    fetch(`https://testnet.arcscan.app/api/v2/addresses/${IDENTITY_REGISTRY}/transactions`)
      .then((r) => r.json())
      .then((data) => {
        const items = (data.items || []).slice(0, 5);
        setRecentIdentities(items.map((tx: Record<string, unknown>) => ({
          hash: tx.hash as string,
          from: (tx.from as { hash: string })?.hash || '',
          timestamp: tx.timestamp as string,
        })));
      })
      .catch(() => {});
  }, []);

  const formatTime = (ts: string): string => {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const parseAgent = (data: unknown) => {
    if (!data) return null;
    const d = data as [bigint, string, string, string, bigint, bigint, bigint, boolean, bigint];
    return { agentId: d[0], owner: d[1], name: d[2], agentType: d[3], budget: d[4], spent: d[5], reputation: d[6], active: d[7] };
  };

  const treasuryAgents = [parseAgent(agent1), parseAgent(agent2), parseAgent(agent3)].filter(Boolean);

  return (
    <div>
      {/* On-chain Treasury Agents */}
      {treasuryAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {treasuryAgents.map((a) => (
            <AgentCard
              key={a!.name}
              name={a!.name}
              type={a!.agentType}
              status={a!.active ? 'active' : 'paused'}
              capabilities={[a!.agentType + '_operations']}
              reputation={Number(a!.reputation)}
            />
          ))}
        </div>
      ) : null}

      {/* Recent ERC-8004 Registrations */}
      {recentIdentities.length > 0 && (
        <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Agent Registrations (ERC-8004)</h3>
          <div className="space-y-2">
            {recentIdentities.map((id) => (
              <a
                key={id.hash}
                href={`${EXPLORER_URL}/tx/${id.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <span className="text-xs font-mono text-gray-400">
                  {id.from.slice(0, 6)}...{id.from.slice(-4)}
                </span>
                <span className="text-xs text-gray-500">{formatTime(id.timestamp)}</span>
              </a>
            ))}
          </div>
          <a href="/agents" className="block text-center text-xs text-violet-400 hover:underline mt-3">
            View all registrations →
          </a>
        </div>
      )}

      {/* Empty state */}
      {treasuryAgents.length === 0 && recentIdentities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No agents registered yet</p>
          <a href="/agents" className="text-violet-400 text-sm hover:underline mt-2 inline-block">
            Register your first agent →
          </a>
        </div>
      )}
    </div>
  );
}
