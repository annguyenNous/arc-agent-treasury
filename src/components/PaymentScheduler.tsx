'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, isAddress } from 'viem';
import { USDC_ADDRESS, EXPLORER_URL } from '@/config/chains';
import { USDC_ABI } from '@/contracts/abis';

interface ScheduledPayment {
  id: string;
  recipient: string;
  amount: string;
  frequency: string;
  label: string;
  nextPayment: string;
}

export default function PaymentScheduler() {
  const { isConnected } = useAccount();
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [label, setLabel] = useState('');

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleAddPayment = () => {
    if (!isAddress(recipient) || !amount) return;
    
    const newPayment: ScheduledPayment = {
      id: Date.now().toString(),
      recipient,
      amount,
      frequency,
      label: label || 'Untitled Payment',
      nextPayment: getNextPaymentDate(frequency),
    };
    
    setPayments([...payments, newPayment]);
    setShowForm(false);
    setRecipient('');
    setAmount('');
    setLabel('');
  };

  const handleExecutePayment = (payment: ScheduledPayment) => {
    writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [payment.recipient as `0x${string}`, parseUnits(payment.amount, 6)],
    });
  };

  const getNextPaymentDate = (freq: string): string => {
    const now = new Date();
    switch (freq) {
      case 'daily': now.setDate(now.getDate() + 1); break;
      case 'weekly': now.setDate(now.getDate() + 7); break;
      case 'monthly': now.setMonth(now.getMonth() + 1); break;
      case 'quarterly': now.setMonth(now.getMonth() + 3); break;
    }
    return now.toLocaleDateString();
  };

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Payment Scheduler</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
        >
          + Add Payment
        </button>
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
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddPayment}
              className="flex-1 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm"
            >
              Schedule
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400">No scheduled payments</p>
          <p className="text-gray-500 text-sm mt-1">Add recurring payments for your AI agents to execute</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{payment.label}</p>
                <p className="text-xs text-gray-400">{payment.amount} USDC · {payment.frequency}</p>
                <p className="text-xs text-gray-500 font-mono">{payment.recipient.slice(0, 10)}...{payment.recipient.slice(-8)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Next: {payment.nextPayment}</p>
                <button
                  onClick={() => handleExecutePayment(payment)}
                  disabled={isPending}
                  className="mt-2 px-3 py-1 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  Execute Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSuccess && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-green-400 text-sm">Payment sent!</p>
          <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-green-300 text-xs hover:underline">
            View transaction →
          </a>
        </div>
      )}
    </div>
  );
}
