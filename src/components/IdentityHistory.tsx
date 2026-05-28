'use client';

import { useEffect, useState } from 'react';
import { IDENTITY_REGISTRY, EXPLORER_URL } from '@/config/chains';

interface IdentityTx {
  hash: string;
  from: string;
  timestamp: string;
  status: string;
}

export default function IdentityHistory() {
  const [identities, setIdentities] = useState<IdentityTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent transactions to the Identity Registry contract
    fetch(`https://testnet.arcscan.app/api/v2/addresses/${IDENTITY_REGISTRY}/transactions`)
      .then((r) => r.json())
      .then((data) => {
        const items = (data.items || []).slice(0, 10);
        const mapped: IdentityTx[] = items.map((tx: Record<string, unknown>) => ({
          hash: tx.hash as string,
          from: (tx.from as { hash: string })?.hash || '',
          timestamp: tx.timestamp as string,
          status: tx.status as string,
        }));
        setIdentities(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatTime = (ts: string): string => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Registrations</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-3 animate-pulse">
              <div className="h-3 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Recent ERC-8004 Registrations</h2>
        <span className="text-xs text-gray-500">{identities.length} recent</span>
      </div>

      {identities.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">No registrations yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {identities.map((id) => (
            <a
              key={id.hash}
              href={`${EXPLORER_URL}/tx/${id.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-800/50 rounded-xl p-3 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">
                  {id.from.slice(0, 6)}...{id.from.slice(-4)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{formatTime(id.timestamp)}</span>
                  <span className={`w-2 h-2 rounded-full ${id.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
