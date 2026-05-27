'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { IDENTITY_REGISTRY, EXPLORER_URL } from '@/config/chains';
import { IDENTITY_REGISTRY_ABI } from '@/contracts/abis';

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

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleRegister = () => {
    // In production, metadata would be uploaded to IPFS first
    const uri = metadataURI || 'ipfs://bafkreibdemo' + Date.now();
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

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-6">Register New Agent</h2>

      {isSuccess ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-green-400 mb-2">Agent Registered!</h3>
          <p className="text-gray-400 mb-4">Your AI agent is now onchain via ERC-8004</p>
          <a
            href={`${EXPLORER_URL}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:underline text-sm"
          >
            View on Explorer →
          </a>
        </div>
      ) : (
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
            onClick={handleRegister}
            disabled={isPending || isConfirming || !name}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? 'Confirming...' : isConfirming ? 'Registering...' : 'Register Agent on ERC-8004'}
          </button>
        </div>
      )}
    </div>
  );
}
