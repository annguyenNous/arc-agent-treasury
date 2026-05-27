'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toHex } from 'viem';
import { IDENTITY_REGISTRY, REPUTATION_REGISTRY } from '@/config/chains';
import { IDENTITY_REGISTRY_ABI, REPUTATION_ABI } from '@/contracts/abis';

// ============================================
// REGISTER AGENT (ERC-8004)
// ============================================

export function useRegisterAgent() {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const register = (metadataURI: string) => {
    writeContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'register',
      args: [metadataURI],
    });
  };

  return { register, txHash, isPending, isConfirming, isSuccess, error };
}

// ============================================
// REPUTATION
// ============================================

export function useUpdateReputation() {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const giveFeedback = (
    agentId: bigint,
    score: number,
    tag: string
  ) => {
    const feedbackHash = keccak256(toHex(tag));
    writeContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_ABI,
      functionName: 'giveFeedback',
      args: [agentId, BigInt(score), 0, tag, '', '', '', feedbackHash],
    });
  };

  return { giveFeedback, txHash, isPending, isConfirming, isSuccess };
}
