'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, isAddress } from 'viem';
import { AGENT_TREASURY, EXPLORER_URL } from '@/config/chains';
import { TREASURY_ABI } from '@/hooks/useAgentTreasury';

export default function PaymentScheduler() {
  const { isConnected } = useAccount();
  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [label, setLabel] = useState('');
  const [agentId, setAgentId] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const getIntervalSeconds = (freq: string): number => {
    switch (freq) {
      case 'once': return 0;
      case 'daily': return 86400;
      case 'weekly': return 604800;
      case 'monthly': return 2592000;
      case 'quarterly': return 7776000;
      default: return 0;
    }
  };

  const handleSchedule = () => {
    if (!isAddress(recipient) || !amount || parseFloat(amount) <= 0) {
      setError('Invalid recipient or amount');
      return;
    }
    setError(null);

    const interval = getIntervalSeconds(frequency);
    const maxExec = frequency === 'once' ? 1 : 0; // 0 = unlimited for recurring

    writeContract({
      address: AGENT_TREASURY,
      abi: TREASURY_ABI,
      functionName: 'schedulePayment',
      args: [
        recipient as `0x${string}`,
        parseUnits(amount, 6),
        BigInt(interval),
        BigInt(maxExec),
        label || 'Payment',
        BigInt(agentId),
      ],
    });
  };

  // Reset form after success
  if (isSuccess && showForm) {
    setTimeout(() => {
      setShowForm(false);
      setRecipient('');
      setAmount('');
      setLabel('');
    }, 2000);
  }

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Payment Scheduler</h2>
        <p className="text-gray-400 text-center py-8">Connect wallet to schedule payments</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Payment Scheduler</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
          >
            + Add Payment
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-3">
          <input
            type="text"
            placeholder="Payment label (e.g., Server Hosting)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 text-sm"
          />
          <input
            type="text"
            placeholder="Recipient address (0x...)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 font-mono text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Amount (USDC)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 text-sm"
            />
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-violet-500 text-sm"
            >
              <option value="once">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <input
            type="number"
            placeholder="Agent ID (default: 1)"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 text-sm"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {writeError && <p className="text-red-400 text-xs">{writeError.message?.slice(0, 150)}</p>}

          {isSuccess && (
            <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
              <p className="text-green-400 text-sm">Payment scheduled on-chain!</p>
              {txHash && (
                <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-green-300 text-xs hover:underline">
                  View TX →
                </a>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSchedule}
              disabled={isPending || !recipient || !amount}
              className="flex-1 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm"
            >
              {isPending ? 'Confirming...' : 'Schedule on Treasury'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Stored on-chain via AgentTreasury · Executable by AI agent or Gelato
          </p>
        </div>
      )}

      {!showForm && !txHash && (
        <div className="text-center py-6">
          <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 text-sm">No scheduled payments</p>
          <p className="text-gray-500 text-xs mt-1">Schedule recurring payments for your AI agents</p>
        </div>
      )}

      {!showForm && isSuccess && (
        <div className="text-center py-4">
          <p className="text-green-400 text-sm mb-1">✓ Payment scheduled!</p>
          <button
            onClick={() => { setShowForm(true); }}
            className="text-violet-400 text-sm hover:underline"
          >
            Schedule another
          </button>
        </div>
      )}
    </div>
  );
}
