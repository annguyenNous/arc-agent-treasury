# ArcAgent Treasury 🤖💰

AI-Powered Treasury Management on ARC Network - Circle's purpose-built L1 for real-time finance.

## Overview

ArcAgent Treasury enables autonomous AI agents to manage treasury operations on ARC Network:
- **Agent Registration** via ERC-8004 (onchain identity + reputation)
- **Job Execution** via ERC-8183 (escrow-based task marketplace)
- **Automated Payments** (recurring bills, payroll, treasury ops)
- **Liquidity Management** (auto-rebalance, yield optimization)

## Features

- 🤖 **ERC-8004 Agent Identity** - Register AI agents with onchain NFT identity
- 📋 **ERC-8183 Jobs** - Create escrow-based jobs for AI agents
- 💸 **Payment Scheduler** - Automate recurring USDC payments
- 📊 **Treasury Dashboard** - Monitor balances, agents, and jobs
- 🔗 **Wallet Integration** - RainbowKit + wagmi for seamless UX

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Web3**: wagmi v2 + viem v2 + RainbowKit v2
- **Network**: ARC Testnet (Chain ID: 5042002)
- **Standards**: ERC-8004 (Identity) + ERC-8183 (Jobs)

## ARC Network

| Parameter | Value |
|-----------|-------|
| Network | ARC Testnet |
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |
| Gas Token | USDC (native) |

## Smart Contracts (ARC Testnet)

| Contract | Address |
|----------|---------|
| ERC-8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| ERC-8004 Validation Registry | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |
| ERC-8183 Agentic Commerce | `0x0747EEf0706327138c69792bF28Cd525089e4583` |
| USDC | `0x3600000000000000000000000000000000000000` |

## Getting Started

```bash
# Clone and install
git clone https://github.com/yourusername/arc-agent-treasury.git
cd arc-agent-treasury
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev
```

## Agent Types

| Type | Capabilities |
|------|--------------|
| Treasury Manager | Balance monitoring, auto-rebalance, risk assessment |
| Payment Scheduler | Invoice processing, scheduled payments, receipt tracking |
| Arbitrage Bot | Rate monitoring, cross-DEX arbitrage, profit optimization |
| Liquidity Manager | LP management, yield farming, IL hedging |
| Billing Agent | Invoice processing, automated payments |

## ERC-8183 Job Lifecycle

1. **Create Job** - Client creates job with provider, deadline, description
2. **Set Budget** - Provider sets the budget
3. **Fund Escrow** - Client approves USDC and funds escrow
4. **Execute** - AI agent performs the task
5. **Submit Deliverable** - Provider submits deliverable hash
6. **Complete & Settle** - Client approves, USDC released

## Grant Alignment

This project aligns with Circle's ARC Network priorities:
- ✅ AI Agent Economy (ERC-8004 + ERC-8183 native support)
- ✅ USDC as native gas token
- ✅ Real-world financial use cases
- ✅ Sub-second finality for real-time operations
- ✅ Cross-chain via CCTP

## License

MIT
