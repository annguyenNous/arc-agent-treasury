'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ArcAgent Treasury</h1>
              <p className="text-xs text-gray-400">AI-Powered Treasury on ARC</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/agents" className="text-sm text-gray-400 hover:text-white transition-colors">Agents</Link>
            <Link href="/jobs" className="text-sm text-gray-400 hover:text-white transition-colors">Jobs</Link>
            <Link href="/payments" className="text-sm text-gray-400 hover:text-white transition-colors">Payments</Link>
          </nav>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
