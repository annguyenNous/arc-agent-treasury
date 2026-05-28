'use client';

import { useState, useEffect } from 'react';
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

export default function RegisterAgent() {
  const { isConnected } = useAccount();
  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState('treasury');
  const [description, setDescription] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [step, setStep] = useState<'form' | 'submitting' | 'done'>('form');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // When TX confirms, try to detect tokenId from logs
  useEffect(() => {
    if (isSuccess && hash) {
      setTxHash(hash);
      // Try to get tokenId from ArcScan API
      fetch(`https://testnet.arcscan.app/api/v2/transactions/${hash}/logs`)
        .then((r) => r.json())
        .then((data) => {
          const items = data.items || [];
          // Find Transfer event from zero address (mint)
          const transferLog = items.find(
            (log: { topics?: string[] }) =>
              log.topics &&
              log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
              log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000'
          );
          if (transferLog && transferLog.topics[3]) {
            setTokenId(BigInt(transferLog.topics[3]).toString());
          }
          setStep('done');
        })
        .catch(() => {
          setStep('done');
        });
    }
  }, [isSuccess, hash]);

  // Show write errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message?.slice(0, 200) || 'Transaction failed');
      setStep('form');
    }
  }, [writeError]);

  const handleRegister = () => {
    if (!name.trim()) return;
    setError(null);
    setStep('submitting');
    const uri = metadataURI || `ipfs://bafkrei${Date.now()}`;
    writeContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'register',
      args: [uri],
    });
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
  if (step === 'done') {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-green-400 mb-2">Agent Registered!</h3>
          <p className="text-gray-400 text-sm mb-3">
            <span className="text-white font-medium">{name}</span> ({agentType})
          </p>
          {tokenId && (
            <p className="text-sm text-gray-400 mb-2">
              Token ID: <span className="text-violet-400 font-mono">#{tokenId}</span>
            </p>
          )}
          {txHash && (
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline text-sm"
            >
              View on Explorer →
            </a>
          )}
          <p className="text-gray-500 text-xs mt-4">
            Agent registered on ERC-8004 Identity Registry
          </p>
          <button
            onClick={() => {
              setStep('form');
              setName('');
              setMetadataURI('');
              setTxHash(null);
              setTokenId(null);
              setError(null);
            }}
            className="mt-4 px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
          >
            Register another
          </button>
        </div>
      </div>
    );
  }

  // Submitting state
  if (step === 'submitting') {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-violet-500/20 animate-pulse flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-2">
            {isPending ? 'Confirm the transaction in your wallet...' : 'Waiting for confirmation...'}
          </p>
          {hash && (
            <a
              href={`${EXPLORER_URL}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 text-sm hover:underline"
            >
              View TX →
            </a>
          )}
          {isConfirming && (
            <p className="text-gray-500 text-xs mt-2">Confirming on blockchain...</p>
          )}
        </div>
      </div>
    );
  }

  // Form
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
            rows={2}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={!name.trim() || isPending}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? 'Confirm in wallet...' : 'Register Agent on ERC-8004'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Registers onchain identity via ERC-8004 on ARC Testnet
        </p>
      </div>
    </div>
  );
}
