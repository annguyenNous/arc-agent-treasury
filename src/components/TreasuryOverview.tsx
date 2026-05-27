'use client';

import { useAccount, useBalance, useReadContract } from 'wagmi';
// Hooks available: useTreasuryBalance, useTreasuryInfo from '@/hooks/useTreasury'
import { USDC_ADDRESS } from '@/config/chains';
import { USDC_ABI } from '@/contracts/abis';

export default function TreasuryOverview() {
  const { address, isConnected } = useAccount();

  const { data: usdcBalance, isLoading } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { data: nativeBalance } = useBalance({ address }); // eslint-disable-line @typescript-eslint/no-unused-vars

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-gray-400 text-lg">Connect wallet to view treasury</p>
        <p className="text-gray-500 text-sm mt-2">Manage AI agents and automated payments</p>
      </div>
    );
  }

  const formattedBalance = usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : '0.00';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Balance */}
      <div className="bg-gradient-to-br from-violet-900/50 to-purple-950 rounded-2xl p-6 border border-violet-800/30 col-span-2">
        <p className="text-sm text-violet-300 mb-1">Treasury Balance</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">
            {isLoading ? '...' : formattedBalance}
          </span>
          <span className="text-lg text-violet-300">USDC</span>
        </div>
        <p className="text-xs text-violet-400 mt-2">
          ARC Testnet · Chain ID: 5042002 · Sub-second finality
        </p>
      </div>

      {/* Active Agents */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <p className="text-sm text-gray-400 mb-1">Active Agents</p>
        <p className="text-3xl font-bold text-cyan-400">0</p>
        <p className="text-xs text-gray-500 mt-2">Registered on ERC-8004</p>
      </div>

      {/* Active Jobs */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <p className="text-sm text-gray-400 mb-1">Active Jobs</p>
        <p className="text-3xl font-bold text-green-400">0</p>
        <p className="text-xs text-gray-500 mt-2">ERC-8183 escrow</p>
      </div>

      {/* Stats Row */}
      <div className="col-span-4 grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500">Total Payments Made</p>
          <p className="text-xl font-semibold text-white">0 USDC</p>
        </div>
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500">Scheduled Payments</p>
          <p className="text-xl font-semibold text-white">0</p>
        </div>
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500">Agent Reputation Avg</p>
          <p className="text-xl font-semibold text-white">--</p>
        </div>
      </div>
    </div>
  );
}
