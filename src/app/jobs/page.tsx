import Header from "@/components/Header";
import CreateJob from "@/components/CreateJob";
import JobHistory from "@/components/JobHistory";

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Jobs</h1>
          <p className="text-gray-400">
            Create and manage autonomous agent jobs via ERC-8183 on ARC Network
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Job Form */}
          <div className="lg:col-span-1">
            <CreateJob />
          </div>

          {/* Job History + Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job History from on-chain */}
            <JobHistory />

            {/* How it works */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-white mb-4">ERC-8183 Job Lifecycle</h2>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Create Job', desc: 'Client creates a job with provider, deadline, and description', color: 'violet' },
                  { step: '2', title: 'Set Budget', desc: 'Provider sets the budget for the job', color: 'blue' },
                  { step: '3', title: 'Fund Escrow', desc: 'Client approves USDC and funds the escrow', color: 'cyan' },
                  { step: '4', title: 'Execute', desc: 'AI agent performs the task (arbitrage, payment, etc.)', color: 'green' },
                  { step: '5', title: 'Submit Deliverable', desc: 'Provider submits deliverable hash', color: 'yellow' },
                  { step: '6', title: 'Complete & Settle', desc: 'Client approves, USDC released from escrow', color: 'emerald' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full bg-${item.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-sm font-bold text-${item.color}-400`}>{item.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contract Info */}
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-3">Contract Addresses (ARC Testnet)</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Agentic Commerce</span>
                  <a href={`${EXPLORER_URL}/address/0x0747EEf0706327138c69792bF28Cd525089e4583`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-violet-400 hover:underline">0x0747EE...4583</a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">USDC</span>
                  <a href={`${EXPLORER_URL}/address/0x3600000000000000000000000000000000000000`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-violet-400 hover:underline">0x360000...0000</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const EXPLORER_URL = 'https://testnet.arcscan.app';
