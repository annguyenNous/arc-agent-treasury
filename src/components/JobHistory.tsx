'use client';

import { useEffect, useState } from 'react';
import { AGENTIC_COMMERCE, EXPLORER_URL } from '@/config/chains';

interface JobTx {
  hash: string;
  method: string;
  from: string;
  to: string;
  timestamp: string;
  status: string;
  blockNumber: number;
}

export default function JobHistory() {
  const [jobs, setJobs] = useState<JobTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent transactions to the Agentic Commerce contract from ArcScan API
    fetch(`https://testnet.arcscan.app/api/v2/addresses/${AGENTIC_COMMERCE}/transactions`)
      .then((r) => r.json())
      .then((data) => {
        const items = (data.items || []).slice(0, 20);
        const mapped: JobTx[] = items.map((tx: Record<string, unknown>) => ({
          hash: tx.hash as string,
          method: (tx.method as string) || 'unknown',
          from: (tx.from as { hash: string })?.hash || '',
          to: (tx.to as { hash: string })?.hash || '',
          timestamp: tx.timestamp as string,
          status: tx.status as string,
          blockNumber: tx.block_number as number,
        }));
        setJobs(mapped);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const getMethodColor = (method: string): string => {
    switch (method.toLowerCase()) {
      case 'createjob': return 'bg-violet-500/20 text-violet-400';
      case 'setbudget': return 'bg-blue-500/20 text-blue-400';
      case 'fund': return 'bg-cyan-500/20 text-cyan-400';
      case 'submit': return 'bg-yellow-500/20 text-yellow-400';
      case 'complete': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

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
        <h2 className="text-lg font-semibold text-white mb-4">Job History</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
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
        <h2 className="text-lg font-semibold text-white">Job History</h2>
        <span className="text-xs text-gray-500">{jobs.length} recent</span>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-400">No job transactions yet</p>
          <p className="text-gray-500 text-sm mt-1">Create a job to see its history here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <a
              key={job.hash}
              href={`${EXPLORER_URL}/tx/${job.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-full font-mono ${getMethodColor(job.method)}`}>
                    {job.method}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {job.from.slice(0, 6)}...{job.from.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{formatTime(job.timestamp)}</span>
                  <span className={`w-2 h-2 rounded-full ${job.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-2">
                {job.hash.slice(0, 20)}...{job.hash.slice(-8)}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
