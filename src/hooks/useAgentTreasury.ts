'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { USDC_ADDRESS, AGENT_TREASURY } from '@/config/chains';
import { USDC_ABI } from '@/contracts/abis';

// Treasury contract address - uses deployed address from chains config, overridable via env
const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`) || AGENT_TREASURY;

// Treasury ABI (simplified for frontend)
const TREASURY_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getTreasuryInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'totalBalance', type: 'uint256' },
          { name: 'allocatedToAgents', type: 'uint256' },
          { name: 'reservedForPayments', type: 'uint256' },
          { name: 'available', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'erc8004TokenId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'agentType', type: 'string' },
      { name: 'budget', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'schedulePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'interval', type: 'uint256' },
      { name: 'maxExecutions', type: 'uint256' },
      { name: 'label', type: 'string' },
      { name: 'agentId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'executePayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'paymentId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'agents',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'owner', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'agentType', type: 'string' },
      { name: 'budget', type: 'uint256' },
      { name: 'spent', type: 'uint256' },
      { name: 'reputation', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'createdAt', type: 'uint256' },
    ],
  },
  {
    name: 'agentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'paymentCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalAllocated',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalReserved',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'checkUpkeep',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'checkData', type: 'bytes' }],
    outputs: [
      { name: 'upkeepNeeded', type: 'bool' },
      { name: 'performData', type: 'bytes' },
    ],
  },
  {
    name: 'performUpkeep',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'performData', type: 'bytes' }],
    outputs: [],
  },
  {
    name: 'getReadyPayments',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'ids', type: 'uint256[]' }],
  },
  {
    name: 'getPayment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'interval', type: 'uint256' },
          { name: 'nextExecution', type: 'uint256' },
          { name: 'totalExecutions', type: 'uint256' },
          { name: 'maxExecutions', type: 'uint256' },
          { name: 'label', type: 'string' },
          { name: 'active', type: 'bool' },
          { name: 'agentId', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'agentId', type: 'uint256' },
          { name: 'owner', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'agentType', type: 'string' },
          { name: 'budget', type: 'uint256' },
          { name: 'spent', type: 'uint256' },
          { name: 'reputation', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'cancelPayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'paymentId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'emergencyPause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

// ============================================
// READ HOOKS
// ============================================

export function useTreasuryInfo() {
  return useReadContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: 'getTreasuryInfo',
    query: { refetchInterval: 10000 },
  });
}

export function useAgentInfo(agentId: number) {
  return useReadContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: 'agents',
    args: [BigInt(agentId)],
    query: { enabled: agentId > 0 },
  });
}

export function useAgentCount() {
  return useReadContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: 'agentCount',
    query: { refetchInterval: 10000 },
  });
}

export function usePaymentCount() {
  return useReadContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: 'paymentCount',
    query: { refetchInterval: 10000 },
  });
}

export function useTotalAllocated() {
  return useReadContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: 'totalAllocated',
    query: { refetchInterval: 10000 },
  });
}

export function useTotalReserved() {
  return useReadContract({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: 'totalReserved',
    query: { refetchInterval: 10000 },
  });
}

// ============================================
// WRITE HOOKS
// ============================================

export function useDepositToTreasury() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const deposit = async (amount: string) => {
    const parsedAmount = parseUnits(amount, 6);
    
    // First approve USDC spending
    // Then deposit
    writeContract({
      address: TREASURY_ADDRESS,
      abi: TREASURY_ABI,
      functionName: 'deposit',
      args: [parsedAmount],
    });
  };

  return { deposit, txHash, isPending, isConfirming, isSuccess };
}

export function useRegisterAgentOnTreasury() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const registerAgent = (
    erc8004TokenId: number,
    name: string,
    agentType: string,
    budget: string
  ) => {
    writeContract({
      address: TREASURY_ADDRESS,
      abi: TREASURY_ABI,
      functionName: 'registerAgent',
      args: [BigInt(erc8004TokenId), name, agentType, parseUnits(budget, 6)],
    });
  };

  return { registerAgent, txHash, isPending, isConfirming, isSuccess };
}

export function useSchedulePayment() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const schedulePayment = (
    recipient: `0x${string}`,
    amount: string,
    intervalSeconds: number,
    maxExecutions: number,
    label: string,
    agentId: number
  ) => {
    writeContract({
      address: TREASURY_ADDRESS,
      abi: TREASURY_ABI,
      functionName: 'schedulePayment',
      args: [
        recipient,
        parseUnits(amount, 6),
        BigInt(intervalSeconds),
        BigInt(maxExecutions),
        label,
        BigInt(agentId),
      ],
    });
  };

  return { schedulePayment, txHash, isPending, isConfirming, isSuccess };
}

export function useExecutePayment() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const executePayment = (paymentId: number) => {
    writeContract({
      address: TREASURY_ADDRESS,
      abi: TREASURY_ABI,
      functionName: 'executePayment',
      args: [BigInt(paymentId)],
    });
  };

  return { executePayment, txHash, isPending, isConfirming, isSuccess };
}

// Treasury address export for use in other components
export { TREASURY_ADDRESS, TREASURY_ABI };
