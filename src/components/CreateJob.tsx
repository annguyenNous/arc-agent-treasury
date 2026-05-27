'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { AGENTIC_COMMERCE, USDC_ADDRESS, EXPLORER_URL } from '@/config/chains';
import { AGENTIC_COMMERCE_ABI, USDC_ABI } from '@/contracts/abis';

const JOB_TYPES = [
  { value: 'liquidity', label: 'Liquidity Management', desc: 'Auto-manage LP positions' },
  { value: 'payment', label: 'Bill Payment', desc: 'Pay recurring bills on schedule' },
  { value: 'arbitrage', label: 'Stablecoin Arbitrage', desc: 'Exploit rate differences' },
  { value: 'rebalance', label: 'Portfolio Rebalance', desc: 'Maintain target allocations' },
];

export default function CreateJob() {
  const { address, isConnected } = useAccount();
  const [jobType, setJobType] = useState('payment');
  const [providerAddr, setProviderAddr] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'form' | 'approve' | 'fund' | 'done'>('form');

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleCreateJob = () => {
    const provider = providerAddr || address;
    const expiredAt = Math.floor(Date.now() / 1000) + 86400; // 24h from now
    
    writeContract({
      address: AGENTIC_COMMERCE,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'createJob',
      args: [
        provider as `0x${string}`,
        address!,
        BigInt(expiredAt),
        description || `${jobType} job`,
        '0x0000000000000000000000000000000000000000',
      ],
    });
    setStep('approve');
  };

  const handleApprove = () => {
    writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [AGENTIC_COMMERCE, parseUnits(budget, 6)],
    });
    setStep('fund');
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Create AI Job</h2>
        <p className="text-gray-400 text-center py-8">Connect wallet to create jobs</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-6">Create AI Job (ERC-8183)</h2>

      {step === 'form' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Job Type</label>
            <div className="grid grid-cols-2 gap-2">
              {JOB_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setJobType(type.value)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    jobType === type.value
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <p className="text-sm font-medium text-white">{type.label}</p>
                  <p className="text-xs text-gray-400">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Budget (USDC)</label>
            <input
              type="number"
              placeholder="10.00"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Provider Address (optional)</label>
            <input
              type="text"
              placeholder="0x... (defaults to your address)"
              value={providerAddr}
              onChange={(e) => setProviderAddr(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              type="text"
              placeholder="What should the agent do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <button
            onClick={handleCreateJob}
            disabled={isPending || !budget}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-600 disabled:opacity-50 transition-all"
          >
            {isPending ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      )}

      {step === 'approve' && isSuccess && (
        <div className="text-center py-4">
          <p className="text-green-400 mb-4">Job created! Now approve USDC spending.</p>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold rounded-xl disabled:opacity-50 transition-all"
          >
            {isPending ? 'Approving...' : `Approve ${budget} USDC`}
          </button>
        </div>
      )}

      {step === 'fund' && isSuccess && (
        <div className="text-center py-4">
          <p className="text-green-400 mb-4">Approved! Job is ready.</p>
          <a
            href={`${EXPLORER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:underline text-sm"
          >
            View on Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
