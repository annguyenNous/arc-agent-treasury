'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, keccak256, toHex } from 'viem';
import { USDC_ADDRESS, AGENTIC_COMMERCE } from '@/config/chains';
import { USDC_ABI, AGENTIC_COMMERCE_ABI } from '@/contracts/abis';

// ============================================
// READ HOOKS
// ============================================

export function useUSDCBalance(address?: `0x${string}`) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
}

export function useTreasuryBalance() {
  const { address } = useAccount();
  return useUSDCBalance(address);
}

// ============================================
// WRITE HOOKS
// ============================================

export function useTransferUSDC() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const transfer = (to: `0x${string}`, amount: string) => {
    writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [to, parseUnits(amount, 6)],
    });
  };

  return { transfer, txHash, isPending, isConfirming, isSuccess, error };
}

export function useApproveUSDC() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const approve = (spender: `0x${string}`, amount: string) => {
    writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [spender, parseUnits(amount, 6)],
    });
  };

  return { approve, txHash, isPending, isConfirming, isSuccess };
}

// ============================================
// JOB HOOKS (ERC-8183)
// ============================================

export function useCreateJob() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const createJob = (
    provider: `0x${string}`,
    client: `0x${string}`,
    description: string,
    durationSeconds: number = 86400
  ) => {
    const expiredAt = Math.floor(Date.now() / 1000) + durationSeconds;
    writeContract({
      address: AGENTIC_COMMERCE,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'createJob',
      args: [provider, client, BigInt(expiredAt), description, '0x0000000000000000000000000000000000000000'],
    });
  };

  return { createJob, txHash, isPending, isConfirming, isSuccess };
}

export function useFundJob() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const fundJob = (jobId: bigint) => {
    writeContract({
      address: AGENTIC_COMMERCE,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'fund',
      args: [jobId, '0x'],
    });
  };

  return { fundJob, txHash, isPending, isConfirming, isSuccess };
}

export function useCompleteJob() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const completeJob = (jobId: bigint, reason: string) => {
    const reasonHash = keccak256(toHex(reason));
    writeContract({
      address: AGENTIC_COMMERCE,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'complete',
      args: [jobId, reasonHash, '0x'],
    });
  };

  return { completeJob, txHash, isPending, isConfirming, isSuccess };
}
