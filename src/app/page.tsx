import Header from "@/components/Header";
import TreasuryOverview from "@/components/TreasuryOverview";
import AgentCard from "@/components/AgentCard";
import PaymentScheduler from "@/components/PaymentScheduler";

const DEMO_AGENTS = [
  {
    name: "Treasury Guardian",
    type: "treasury",
    status: "active" as const,
    capabilities: ["balance_monitoring", "auto_rebalance", "risk_assessment"],
    reputation: 95,
  },
  {
    name: "Bill Pay Bot",
    type: "billing",
    status: "active" as const,
    capabilities: ["invoice_processing", "scheduled_payments", "receipt_tracking"],
    reputation: 88,
  },
  {
    name: "Arb Scanner",
    type: "arbitrage",
    status: "paused" as const,
    capabilities: ["rate_monitoring", "cross_dex_arbitrage", "profit_optimization"],
    reputation: 72,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
            AI-Powered Treasury
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Autonomous AI agents managing your payments, liquidity, and treasury on ARC Network.
            Sub-second finality, USDC native gas, ERC-8004 identity.
          </p>
        </div>

        {/* Network Banner */}
        <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-4 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm text-gray-300">
              ARC Testnet · ERC-8004 Agent Identity · ERC-8183 Jobs
            </span>
          </div>
          <div className="flex gap-4">
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:underline">
              Get Test USDC →
            </a>
            <a href="https://docs.arc.io/build" target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:underline">
              ARC Docs →
            </a>
          </div>
        </div>

        {/* Treasury Overview */}
        <div className="mb-8">
          <TreasuryOverview />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Your Agents</h2>
              <a href="/agents" className="text-sm text-violet-400 hover:underline">View All →</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_AGENTS.map((agent) => (
                <AgentCard key={agent.name} {...agent} />
              ))}
            </div>
          </div>

          {/* Payment Scheduler */}
          <div>
            <PaymentScheduler />
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Sub-Second Finality</h3>
            <p className="text-sm text-gray-400">
              ARC Network confirms transactions in under 1 second. Perfect for real-time treasury operations.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">ERC-8004 Identity</h3>
            <p className="text-sm text-gray-400">
              Onchain agent identity with reputation tracking. Build trust through verified credentials.
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">USDC Native Gas</h3>
            <p className="text-sm text-gray-400">
              Predictable fees in USDC. No volatile ETH gas costs. Budget with confidence.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>Built on ARC Network · Powered by Circle · ERC-8004 + ERC-8183</p>
          <p className="mt-1">AI Agents for Autonomous Treasury Management</p>
        </div>
      </footer>
    </div>
  );
}
