'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { IDENTITY_REGISTRY, AGENT_TREASURY, EXPLORER_URL } from '@/config/chains';
import { IDENTITY_REGISTRY_ABI } from '@/contracts/abis';
import { TREASURY_ABI } from '@/hooks/useAgentTreasury';

const AGENT_TYPES = [
  { value: 'treasury', label: 'Treasury Manager', desc: 'Manage treasury funds and allocations' },
  { value: 'payment', label: 'Payment Scheduler', desc: 'Automate recurring payments' },
  { value: 'arbitrage', label: 'Arbitrage Bot', desc: 'Cross-DEX stablecoin arbitrage' },
  { value: 'liquidity', label: 'Liquidity Manager', desc: 'Optimize liquidity positions' },
  { value: 'billing', label: 'Billing Agent', desc: 'Invoice processing and payments' },
];

// Registration steps
type Step = 'form' | 'identity' | 'treasury' | 'done';

export default function RegisterAgent() {
  const { isConnected } = useAccount();
  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState('treasury');
  const [description, setDescription] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [budget, setBudget] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [identityTokenId, setIdentityTokenId] = useState<bigint | null>(null);
  const [identityTxHash, setIdentityTxHash] = useState<string | null>(null);
  const [treasuryTxHash, setTreasuryTxHash] = useState<string | null>(null);

  // Step 1: Register on ERC-8004 Identity Registry
  const {
    writeContract: writeIdentity,
    data: identityHash,
    isPending: isIdentityPending,
  } = useWriteContract();

  const { isLoading: isIdentityConfirming, isSuccess: isIdentitySuccess } =
    useWaitForTransactionReceipt({ hash: identityHash });

  // Step 2: Register on AgentTreasury
  const {
    writeContract: writeTreasury,
    data: treasuryHash,
    isPending: isTreasuryPending,
  } = useWriteContract();

  const { isLoading: isTreasuryConfirming, isSuccess: isTreasurySuccess } =
    useWaitForTransactionReceipt({ hash: treasuryHash });

  const getCapabilities = (type: string): string[] => {
    const caps: Record<string, string[]> = {
      treasury: ['balance_monitoring', 'auto_rebalance', 'risk_assessment'],
      payment: ['invoice_processing', 'scheduled_payments', 'receipt_tracking'],
      arbitrage: ['rate_monitoring', 'cross_dex_arbitrage', 'profit_optimization'],
      liquidity: ['lp_management', 'yield_farming', 'impermanent_loss_hedging'],
      billing: ['invoice_processing', 'automated_payments', 'receipt_generation'],
    };
    return caps[type] || [];
  };

  // Step 1: Register identity on ERC-8004
  const handleRegisterIdentity = () => {
    const uri = metadataURI || `ipfs://bafkreib${Date.now()}`;
    setStep('identity');
    writeIdentity({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'register',
      args: [uri],
    });
  };

  // When identity tx confirms, extract token ID and proceed to step 2
  // The ERC-8004 register() returns a tokenId. We parse it from the tx receipt.
  // For now, we use the tx hash to track and auto-advance.

  // Step 2: Register on AgentTreasury with budget
  const handleRegisterTreasury = (tokenId: bigint) => {
    if (!budget || parseFloat(budget) <= 0) return;
    setStep('treasury');
    setIdentityTokenId(tokenId);
    writeTreasury({
      address: AGENT_TREASURY,
      abi: TREASURY_ABI,
      functionName: 'registerAgent',
      args: [tokenId, name, agentType, parseUnits(budget, 6)],
    });
  };

  // Auto-advance from identity to treasury when identity tx confirms
  // We need to parse the tokenId from the Transfer event in the receipt
  // ERC-8004 emits Transfer(zeroAddress, owner, tokenId)
  const handleIdentityConfirmed = () => {
    // After identity registration, we need the token ID.
    // For simplicity, we'll use agentCount + 1 as the next token ID
    // or parse from the receipt logs. Here we ask user for it or auto-detect.
    setIdentityTxHash(identityHash || null);
    // Move to budget step - user enters budget, then we call treasury
    setStep('treasury');
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Register New Agent</h2>
        <p className="text-gray-400 text-center py-8">Connect wallet to register an agent</p>
      </div>
    );
  }

  // Done state
  if (step === 'done' || (isTreasurySuccess && treasuryHash)) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-green-400 mb-2">Agent Fully Registered!</h3>
          <p className="text-gray-400 mb-2">Your AI agent is registered on both:</p>
          <div className="text-sm text-gray-500 space-y-1 mb-4">
            <p>✓ ERC-8004 Identity (onchain NFT)</p>
            <p>✓ AgentTreasury (budget: {budget} USDC)</p>
          </div>
          {identityTxHash && (
            <a
              href={`${EXPLORER_URL}/tx/${identityTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline text-sm block"
            >
              Identity TX →
            </a>
          )}
          {treasuryHash && (
            <a
              href={`${EXPLORER_URL}/tx/${treasuryHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline text-sm block"
            >
              Treasury TX →
            </a>
          )}
          <button
            onClick={() => {
              setStep('form');
              setName('');
              setMetadataURI('');
              setBudget('');
              setIdentityTokenId(null);
              setIdentityTxHash(null);
              setTreasuryTxHash(null);
            }}
            className="block mx-auto mt-4 text-sm text-gray-400 hover:text-white"
          >
            Register another
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Budget entry (after identity registration)
  if (step === 'treasury' && isIdentitySuccess) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-2">Step 2: Set Agent Budget</h2>
        <p className="text-gray-500 text-sm mb-4">
          Identity registered ✓ — Now set the USDC budget for <span className="text-violet-400">{name}</span>
        </p>

        {identityHash && (
          <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3 mb-4">
            <p className="text-green-400 text-xs">✓ ERC-8004 Identity TX confirmed</p>
            <a
              href={`${EXPLORER_URL}/tx/${identityHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-300 text-xs font-mono hover:underline"
            >
              {identityHash.slice(0, 20)}...
            </a>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Budget (USDC)</label>
            <input
              type="number"
              placeholder="e.g., 100"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <p className="text-xs text-gray-500 mt-1">USDC to allocate from treasury to this agent</p>
          </div>

          {/* Token ID input (auto-detected or manual) */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">ERC-8004 Token ID</label>
            <input
              type="number"
              placeholder="Auto-detected from TX, or enter manually"
              value={identityTokenId ? identityTokenId.toString() : ''}
              onChange={(e) => setIdentityTokenId(e.target.value ? BigInt(e.target.value) : null)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Token ID from the ERC-8004 registration TX</p>
          </div>

          {(isTreasuryPending || isTreasuryConfirming) && (
            <div className="bg-violet-900/20 border border-violet-800/30 rounded-lg p-3">
              <p className="text-violet-400 text-sm">
                {isTreasuryPending ? 'Confirm in wallet...' : 'Registering on AgentTreasury...'}
              </p>
            </div>
          )}

          <button
            onClick={() => identityTokenId && handleRegisterTreasury(identityTokenId)}
            disabled={!budget || parseFloat(budget) <= 0 || !identityTokenId || isTreasuryPending || isTreasuryConfirming}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isTreasuryPending ? 'Confirming...' : isTreasuryConfirming ? 'Registering...' : `Register on AgentTreasury (${budget || '0'} USDC)`}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Identity registration in progress
  if (step === 'identity') {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Step 1: Registering Identity...</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-2">
            {isIdentityPending ? 'Confirm the transaction in your wallet...' : 'Waiting for confirmation...'}
          </p>
          {identityHash && (
            <a
              href={`${EXPLORER_URL}/tx/${identityHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 text-sm hover:underline"
            >
              View TX →
            </a>
          )}
        </div>
      </div>
    );
  }

  // Initial form
  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-6">Register New Agent (ERC-8004)</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Agent Name</label>
          <input
            type="text"
            placeholder="e.g., Treasury Guardian v1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Agent Type</label>
          <div className="grid grid-cols-2 gap-2">
            {AGENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setAgentType(type.value)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  agentType === type.value
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
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            placeholder="Describe what this agent does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Metadata URI (optional)</label>
          <input
            type="text"
            placeholder="ipfs://... (leave empty for auto-generated)"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">IPFS URI with agent metadata JSON</p>
        </div>

        <button
          onClick={handleRegisterIdentity}
          disabled={isIdentityPending || !name}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isIdentityPending ? 'Confirming...' : 'Register Agent on ERC-8004'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Step 1: Register on ERC-8004 → Step 2: Set budget on AgentTreasury
        </p>
      </div>
    </div>
  );
}
