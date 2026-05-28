'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { AGENT_TREASURY, IDENTITY_REGISTRY, EXPLORER_URL } from '@/config/chains';
import { TREASURY_ABI } from '@/hooks/useAgentTreasury';

const AGENT_TYPES = [
  { value: 'treasury', label: 'Treasury Manager' },
  { value: 'payment', label: 'Payment Scheduler' },
  { value: 'arbitrage', label: 'Arbitrage Bot' },
  { value: 'liquidity', label: 'Liquidity Manager' },
  { value: 'billing', label: 'Billing Agent' },
];

export default function RegisterOnTreasury() {
  const { address, isConnected } = useAccount();
  const [tokenId, setTokenId] = useState('');
  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState('treasury');
  const [budget, setBudget] = useState('');
  const [step, setStep] = useState<'form' | 'done'>('form');

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Auto-detect tokenId from recent ERC-8004 registration
  useEffect(() => {
    if (!address) return;
    fetch(`https://testnet.arcscan.app/api/v2/addresses/${IDENTITY_REGISTRY}/transactions`)
      .then((r) => r.json())
      .then((data) => {
        const items = data.items || [];
        // Find the most recent register TX from this user
        const myTx = items.find((tx: { from: { hash: string } }) =>
          tx.from?.hash?.toLowerCase() === address.toLowerCase()
        );
        if (myTx) {
          // Get tokenId from the TX logs
          fetch(`https://testnet.arcscan.app/api/v2/transactions/${myTx.hash}/logs`)
            .then((r) => r.json())
            .then((logData) => {
              const logItems = logData.items || [];
              const transferLog = logItems.find(
                (log: { topics?: string[] }) =>
                  log.topics &&
                  log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                  log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000'
              );
              if (transferLog?.topics?.[3]) {
                setTokenId(BigInt(transferLog.topics[3]).toString());
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [address]);

  const handleRegister = () => {
    if (!tokenId || !name || !budget) return;
    writeContract({
      address: AGENT_TREASURY,
      abi: TREASURY_ABI,
      functionName: 'registerAgent',
      args: [BigInt(tokenId), name, agentType, parseUnits(budget, 6)],
    });
  };

  if (isSuccess && step === 'form') {
    setTimeout(() => setStep('done'), 100);
  }

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Register on Treasury</h2>
        <p className="text-gray-400 text-center py-4">Connect wallet</p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-400 mb-1">Agent Registered on Treasury!</h3>
          <p className="text-gray-400 text-sm">{name} · {budget} USDC budget</p>
          {txHash && (
            <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 text-xs hover:underline">
              View TX →
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Register Agent on Treasury</h2>
      <p className="text-xs text-gray-500 mb-4">
        Register your ERC-8004 agent on AgentTreasury with a USDC budget
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">ERC-8004 Token ID</label>
          <input
            type="text"
            placeholder="Auto-detected or enter manually"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Agent Name</label>
          <input
            type="text"
            placeholder="e.g., My Treasury Agent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Agent Type</label>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
          >
            {AGENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Budget (USDC)</label>
          <input
            type="number"
            placeholder="10"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs">{error.message?.slice(0, 150)}</p>
        )}

        <button
          onClick={handleRegister}
          disabled={!tokenId || !name || !budget || isPending}
          className="w-full py-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
        >
          {isPending ? 'Confirming...' : 'Register on Treasury'}
        </button>
      </div>
    </div>
  );
}
