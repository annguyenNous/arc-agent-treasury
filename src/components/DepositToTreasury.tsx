'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { AGENT_TREASURY, USDC_ADDRESS, EXPLORER_URL } from '@/config/chains';
import { USDC_ABI } from '@/contracts/abis';
import { TREASURY_ABI } from '@/hooks/useAgentTreasury';

export default function DepositToTreasury() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'approve' | 'deposit' | 'done'>('form');

  // Read user's USDC balance
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const balanceFormatted = balance ? formatUnits(balance, 6) : '0';

  // Step 1: Approve USDC spending
  const handleApprove = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [AGENT_TREASURY, parseUnits(amount, 6)],
    });
    setStep('approve');
  };

  // Step 2: Deposit to treasury (after approval confirms)
  const handleDeposit = () => {
    writeContract({
      address: AGENT_TREASURY,
      abi: TREASURY_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 6)],
    });
    setStep('deposit');
  };

  // Auto-advance from approve to deposit
  if (step === 'approve' && isSuccess) {
    // Use setTimeout to avoid state update during render
    setTimeout(() => handleDeposit(), 100);
  }

  // Auto-advance from deposit to done
  if (step === 'deposit' && isSuccess) {
    setTimeout(() => setStep('done'), 100);
  }

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Deposit to Treasury</h2>
        <p className="text-gray-400 text-center py-4">Connect wallet to deposit</p>
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
          <h3 className="text-lg font-semibold text-green-400 mb-1">Deposited!</h3>
          <p className="text-gray-400 text-sm">{amount} USDC → Treasury</p>
          {txHash && (
            <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 text-xs hover:underline">
              View TX →
            </a>
          )}
          <button
            onClick={() => { setStep('form'); setAmount(''); }}
            className="mt-3 text-xs text-gray-400 hover:text-white"
          >
            Deposit more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Deposit USDC to Treasury</h2>
      <p className="text-xs text-gray-500 mb-4">
        Your balance: <span className="text-white">{balanceFormatted} USDC</span>
      </p>

      <div className="space-y-3">
        <input
          type="number"
          placeholder="Amount (USDC)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.01"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
        />

        {/* Quick amount buttons */}
        <div className="flex gap-2">
          {['1', '5', '10', 'all'].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v === 'all' ? balanceFormatted : v)}
              className="flex-1 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:border-violet-500 transition-colors"
            >
              {v === 'all' ? 'MAX' : `${v} USDC`}
            </button>
          ))}
        </div>

        {step === 'approve' && isPending && (
          <p className="text-violet-400 text-sm">Approve USDC in wallet...</p>
        )}
        {step === 'deposit' && isPending && (
          <p className="text-violet-400 text-sm">Confirm deposit in wallet...</p>
        )}

        <button
          onClick={handleApprove}
          disabled={!amount || parseFloat(amount) <= 0 || isPending}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? 'Confirming...' : `Deposit ${amount || '0'} USDC`}
        </button>

        <p className="text-xs text-gray-500 text-center">
          2 transactions: Approve → Deposit
        </p>
      </div>
    </div>
  );
}
