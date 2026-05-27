import Header from "@/components/Header";
import RegisterAgent from "@/components/RegisterAgent";
import AgentCard from "@/components/AgentCard";

const DEMO_AGENTS = [
  {
    name: "Treasury Guardian",
    type: "treasury",
    status: "active" as const,
    capabilities: ["balance_monitoring", "auto_rebalance", "risk_assessment"],
    reputation: 95,
    agentId: "8004-001",
  },
  {
    name: "Bill Pay Bot",
    type: "billing",
    status: "active" as const,
    capabilities: ["invoice_processing", "scheduled_payments", "receipt_tracking"],
    reputation: 88,
    agentId: "8004-002",
  },
  {
    name: "Arb Scanner",
    type: "arbitrage",
    status: "paused" as const,
    capabilities: ["rate_monitoring", "cross_dex_arbitrage", "profit_optimization"],
    reputation: 72,
    agentId: "8004-003",
  },
  {
    name: "Liquidity Optimizer",
    type: "liquidity",
    status: "active" as const,
    capabilities: ["lp_management", "yield_farming", "impermanent_loss_hedging"],
    reputation: 81,
    agentId: "8004-004",
  },
];

export default function AgentsPage() {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_AGENTS.map((agent) => (
                <AgentCard key={agent.name} {...agent} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
