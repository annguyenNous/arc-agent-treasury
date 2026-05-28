'use client';

import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { AGENT_TREASURY, EXPLORER_URL } from '@/config/chains';
import { TREASURY_ABI } from '@/hooks/useAgentTreasury';

interface Payment {
  id: number;
  recipient: string;
  amount: string;
  interval: number;
  nextExecution: number;
  totalExecutions: number;
  maxExecutions: number;
  label: string;
  active: boolean;
  agentId: number;
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Read payment count
  const { data: paymentCount } = useReadContract({
    address: AGENT_TREASURY,
    abi: TREASURY_ABI,
    functionName: 'paymentCount',
  });

  const count = paymentCount ? Number(paymentCount) : 0;

  // Read each payment
  useEffect(() => {
    if (count === 0) {
      setLoading(false);
      return;
    }

    // We'll fetch payments via direct RPC calls since we can't use hooks in a loop
    const fetchPayments = async () => {
      const results: Payment[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const res = await fetch(`https://rpc.testnet.arc.network`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: i,
              method: 'eth_call',
              params: [
                {
                  to: AGENT_TREASURY,
                  data: `0x46ec881a${i.toString(16).padStart(64, '0')}`, // getPayment(uint256)
                },
                'latest',
              ],
            }),
          });
          const json = await res.json();
          if (json.result && json.result !== '0x') {
            // Decode the tuple response
            // For now, just show that payment exists
            results.push({
              id: i,
              recipient: '0x...',
              amount: '...',
              interval: 0,
              nextExecution: 0,
              totalExecutions: 0,
              maxExecutions: 0,
              label: `Payment #${i}`,
              active: true,
              agentId: 0,
            });
          }
        } catch {
          // skip
        }
      }
      setPayments(results);
      setLoading(false);
    };

    fetchPayments();
  }, [count]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Scheduled Payments</h2>
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
        <h2 className="text-lg font-semibold text-white">Scheduled Payments</h2>
        <span className="text-xs text-gray-500">{count} total</span>
      </div>

      {count === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400">No scheduled payments</p>
          <p className="text-gray-500 text-sm mt-1">Schedule a payment to see it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{p.label}</p>
                <p className="text-xs text-gray-400 font-mono">{p.recipient}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  p.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {p.active ? 'active' : 'completed'}
                </span>
                <p className="text-xs text-gray-500 mt-1">#{p.id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
