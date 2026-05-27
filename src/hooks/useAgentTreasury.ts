'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { USDC_ADDRESS } from '@/config/chains';
import { USDC_ABI } from '@/contracts/abis';

// Treasury contract address (update after deployment)
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

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
