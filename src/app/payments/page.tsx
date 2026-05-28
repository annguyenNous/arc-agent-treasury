import Header from "@/components/Header";
import PaymentScheduler from "@/components/PaymentScheduler";
import PaymentHistory from "@/components/PaymentHistory";

export default function PaymentsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Payments</h1>
          <p className="text-gray-400">
            Schedule and manage automated USDC payments on ARC Network
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Scheduler */}
          <div className="lg:col-span-2 space-y-6">
            <PaymentScheduler />
            <PaymentHistory />
          </div>

          {/* Payment Types */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Payment Types</h3>
              <div className="space-y-3">
                {[
                  { icon: '📋', name: 'Bill Payments', desc: 'Recurring utility, hosting, SaaS bills' },
                  { icon: '💰', name: 'Payroll', desc: 'Automated salary distributions' },
                  { icon: '🏦', name: 'Treasury Ops', desc: 'Fund allocation and rebalancing' },
                  { icon: '🌉', name: 'Cross-Chain', desc: 'CCTP bridge to other networks' },
                ].map((type) => (
                  <div key={type.name} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{type.name}</p>
                      <p className="text-xs text-gray-400">{type.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Why ARC?</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Sub-second finality</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>USDC native gas (predictable fees)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>EVM compatible</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>CCTP cross-chain bridge</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
