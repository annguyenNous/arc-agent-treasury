'use client';

interface AgentCardProps {
  name: string;
  type: string;
  status: 'active' | 'paused' | 'pending';
  capabilities: string[];
  reputation?: number;
  agentId?: string;
}

export default function AgentCard({ name, type, status, capabilities, reputation, agentId }: AgentCardProps) {
  const statusColors = {
    active: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    pending: 'bg-gray-500/20 text-gray-400',
  };

  const typeIcons: Record<string, string> = {
    treasury: '🏦',
    payment: '💸',
    arbitrage: '📊',
    liquidity: '🌊',
    billing: '📋',
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-800/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
            {typeIcons[type] || '🤖'}
          </div>
          <div>
            <h3 className="font-semibold text-white">{name}</h3>
            <p className="text-xs text-gray-400 capitalize">{type} Agent</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
          {status}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Capabilities</p>
        <div className="flex flex-wrap gap-1">
          {capabilities.map((cap) => (
            <span key={cap} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
              {cap.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {reputation !== undefined && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <span className="text-xs text-gray-500">Reputation</span>
          <div className="flex items-center gap-1">
            <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                style={{ width: `${reputation}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{reputation}/100</span>
          </div>
        </div>
      )}

      {agentId && (
        <p className="text-xs text-gray-600 mt-2 font-mono">ID: {agentId}</p>
      )}
    </div>
  );
}
