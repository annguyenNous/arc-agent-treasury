'use client';

import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import RegisterAgent from "@/components/RegisterAgent";
import AgentCard from "@/components/AgentCard";
import { useAgentCount, useAgentInfo } from '@/hooks/useAgentTreasury';
import { TREASURY_ADDRESS } from '@/hooks/useAgentTreasury';

const isTreasuryConfigured = TREASURY_ADDRESS !== '0x0000000000000000000000000000000000000000';

// Component to render a single agent from on-chain data
function OnChainAgentCard({ agentId }: { agentId: number }) {
  const { data: agentData, isLoading } = useAgentInfo(agentId);

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-gray-800 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-800 rounded w-full"></div>
      </div>
    );
  }

  if (!agentData) return null;

  // Agent tuple: [agentId, owner, name, agentType, budget, spent, reputation, active, createdAt]
  const agent = agentData as [bigint, string, string, string, bigint, bigint, bigint, boolean, bigint];
  const [, , name, agentType, budget, spent, reputation, active] = agent;

  return (
    <AgentCard
      name={name}
      type={agentType}
      status={active ? 'active' : 'paused'}
      capabilities={[agentType + '_operations']}
      reputation={Number(reputation)}
      agentId={`8004-${String(agentId).padStart(3, '0')}`}
    />
  );
}

export default function AgentsPage() {
  const { data: agentCount, isLoading: isCountLoading } = useAgentCount();
  const count = agentCount ? Number(agentCount) : 0;

  // Generate array of agent IDs [1, 2, ..., count]
  const agentIds = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Agents</h1>
          <p className="text-gray-400">
            Register and manage autonomous AI agents on ARC Network via ERC-8004
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Register Form */}
          <div className="lg:col-span-1">
            <RegisterAgent />
            
            {/* Info Box */}
            <div className="mt-6 bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-3">ERC-8004 Agent Identity</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>Each agent gets an onchain NFT identity with:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Unique agent ID (token ID)</li>
                  <li>Metadata URI (capabilities, version)</li>
                  <li>Reputation score (0-100)</li>
                  <li>Validation credentials</li>
                </ul>
                <div className="pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-500">Contracts on ARC Testnet:</p>
                  <p className="text-xs font-mono text-violet-400">Identity: 0x8004A8...4BD9e</p>
                  <p className="text-xs font-mono text-violet-400">Reputation: 0x8004B6...8713</p>
                  <p className="text-xs font-mono text-violet-400">Validation: 0x8004Cb...4272</p>
                </div>
              </div>
            </div>
          </div>

          {/* Agent List */}
          <div className="lg:col-span-2">
            {!isTreasuryConfigured ? (
              /* Treasury not configured - show demo message */
              <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-gray-400 text-lg">Treasury contract not configured</p>
                <p className="text-gray-500 text-sm mt-2">
                  Set NEXT_PUBLIC_TREASURY_ADDRESS in .env.local to view on-chain agents
                </p>
              </div>
            ) : isCountLoading ? (
              /* Loading state */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 animate-pulse">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-800"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-800 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-800 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : count === 0 ? (
              /* Empty state */
              <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-lg">No agents registered yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Register your first AI agent using the form on the left
                </p>
              </div>
            ) : (
              /* On-chain agents */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentIds.map((id) => (
                  <OnChainAgentCard key={id} agentId={id} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
