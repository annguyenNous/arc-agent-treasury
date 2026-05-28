'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useTreasuryInfo, useAgentCount, usePaymentCount, useTotalAllocated, useTotalReserved, TREASURY_ADDRESS, TREASURY_ABI } from '@/hooks/useAgentTreasury';
import { USDC_ADDRESS } from '@/config/chains';
import { USDC_ABI } from '@/contracts/abis';

const isTreasuryConfigured = TREASURY_ADDRESS !== '0x0000000000000000000000000000000000000000';

export default function TreasuryOverview() {
  const { address, isConnected } = useAccount();

  // Read treasury contract's USDC balance
  const { data: treasuryBalance, isLoading: isTreasuryBalanceLoading } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: isTreasuryConfigured ? [TREASURY_ADDRESS] : undefined,
    query: { enabled: isTreasuryConfigured, refetchInterval: 5000 },
  });

  // Read treasury allocation info
  const { data: treasuryInfo, isLoading: isTreasuryInfoLoading } = useTreasuryInfo();

  // Read individual stats
  const { data: agentCount } = useAgentCount();
  const { data: paymentCount } = usePaymentCount();
  const { data: totalAllocated } = useTotalAllocated();
  const { data: totalReserved } = useTotalReserved();

  // Read user's personal USDC balance
  const { data: userBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const isLoading = isTreasuryBalanceLoading || isTreasuryInfoLoading;

  // Format values from getTreasuryInfo or fallback to individual reads
  const info = treasuryInfo as { totalBalance: bigint; allocatedToAgents: bigint; reservedForPayments: bigint; available: bigint } | undefined;

  const formattedTreasuryBalance = info
    ? (Number(info.totalBalance) / 1e6).toFixed(2)
    : treasuryBalance
    ? (Number(treasuryBalance) / 1e6).toFixed(2)
    : '0.00';

  const formattedAllocated = info
    ? (Number(info.allocatedToAgents) / 1e6).toFixed(2)
    : totalAllocated
    ? (Number(totalAllocated) / 1e6).toFixed(2)
    : '0.00';

  const formattedReserved = info
    ? (Number(info.reservedForPayments) / 1e6).toFixed(2)
    : totalReserved
    ? (Number(totalReserved) / 1e6).toFixed(2)
    : '0.00';

  const formattedAvailable = info
    ? (Number(info.available) / 1e6).toFixed(2)
    : '0.00';

  const agentCountDisplay = agentCount ? Number(agentCount) : 0;
  const paymentCountDisplay = paymentCount ? Number(paymentCount) : 0;

  // Demo/fallback state when treasury contract not configured
  if (!isTreasuryConfigured) {
    return (
      <div className="space-y-4">
        {/* Demo Mode Banner */}
        <div className="bg-yellow-900/30 border border-yellow-800/50 rounded-xl p-4 text-center">
          <p className="text-yellow-400 text-sm font-medium">Demo Mode</p>
          <p className="text-yellow-500/80 text-xs mt-1">
            Set NEXT_PUBLIC_TREASURY_ADDRESS in .env.local to connect to a deployed treasury contract
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Balance - Demo */}
          <div className="bg-gradient-to-br from-violet-900/50 to-purple-950 rounded-2xl p-6 border border-violet-800/30 col-span-2">
            <p className="text-sm text-violet-300 mb-1">Treasury Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">0.00</span>
              <span className="text-lg text-violet-300">USDC</span>
            </div>
            <p className="text-xs text-violet-400 mt-2">Contract not configured</p>
          </div>

          {/* Allocated - Demo */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-sm text-gray-400 mb-1">Allocated to Agents</p>
            <p className="text-3xl font-bold text-cyan-400">0.00</p>
            <p className="text-xs text-gray-500 mt-2">USDC</p>
          </div>

          {/* Reserved - Demo */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <p className="text-sm text-gray-400 mb-1">Reserved for Payments</p>
            <p className="text-3xl font-bold text-green-400">0.00</p>
            <p className="text-xs text-gray-500 mt-2">USDC</p>
          </div>

          {/* Stats Row - Demo */}
          <div className="col-span-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-500">Available</p>
              <p className="text-xl font-semibold text-white">0.00 USDC</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-500">Active Agents</p>
              <p className="text-xl font-semibold text-white">0</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-500">Payments</p>
              <p className="text-xl font-semibold text-white">0</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Treasury Contract Balance */}
        <div className="bg-gradient-to-br from-violet-900/50 to-purple-950 rounded-2xl p-6 border border-violet-800/30 col-span-2">
          <p className="text-sm text-violet-300 mb-1">Treasury Contract Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">
              {isLoading ? '...' : formattedTreasuryBalance}
            </span>
            <span className="text-lg text-violet-300">USDC</span>
          </div>
          <p className="text-xs text-violet-400 mt-2 font-mono">{TREASURY_ADDRESS}</p>
        </div>

        {/* Allocated to Agents */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <p className="text-sm text-gray-400 mb-1">Allocated to Agents</p>
          <p className="text-3xl font-bold text-cyan-400">
            {isLoading ? '...' : formattedAllocated}
          </p>
          <p className="text-xs text-gray-500 mt-2">USDC · {agentCountDisplay} agents</p>
        </div>

        {/* Reserved for Payments */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <p className="text-sm text-gray-400 mb-1">Reserved for Payments</p>
          <p className="text-3xl font-bold text-green-400">
            {isLoading ? '...' : formattedReserved}
          </p>
          <p className="text-xs text-gray-500 mt-2">USDC · {paymentCountDisplay} scheduled</p>
        </div>

        {/* Stats Row */}
        <div className="col-span-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-500">Available</p>
            <p className="text-xl font-semibold text-white">
              {isLoading ? '...' : `${formattedAvailable} USDC`}
            </p>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-500">Active Agents</p>
            <p className="text-xl font-semibold text-white">{agentCountDisplay}</p>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-500">Scheduled Payments</p>
            <p className="text-xl font-semibold text-white">{paymentCountDisplay}</p>
          </div>
        </div>
      </div>

      {/* User's Personal Balance */}
      {isConnected && userBalance !== undefined && (
        <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Your Wallet Balance</p>
            <p className="text-sm font-medium text-gray-300">
              {(Number(userBalance) / 1e6).toFixed(2)} USDC
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
