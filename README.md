# ArcAgent Treasury 🤖💰

AI-Powered Treasury Management on ARC Network - Circle's purpose-built L1 for real-time finance.

**🚀 Live Demo: [arc-agent-treasury.vercel.app](https://arc-agent-treasury.vercel.app)**

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
- 🧠 **AI Agent** - LangChain + Claude for autonomous decisions
- ⏰ **Cron Automation** - node-cron for scheduled tasks
- 🔐 **Safety Guardrails** - Balance checks, approval thresholds

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Web3**: wagmi v2 + viem v2 + RainbowKit v2
- **AI**: LangChain + Claude 3.5 Sonnet
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

| Contract | Address | Verified |
|----------|---------|----------|
| ERC-8004 Identity Registry | [`0x8004A818BFB912233c491871b3d84c89A494BD9e`](https://testnet.arcscan.app/address/0x8004A818BFB912233c491871b3d84c89A494BD9e) | ✅ |
| ERC-8004 Reputation Registry | [`0x8004B663056A597Dffe9eCcC1965A193B7388713`](https://testnet.arcscan.app/address/0x8004B663056A597Dffe9eCcC1965A193B7388713) | ✅ |
| ERC-8004 Validation Registry | [`0x8004Cb1BF31DAf7788923b405b754f57acEB4272`](https://testnet.arcscan.app/address/0x8004Cb1BF31DAf7788923b405b754f57acEB4272) | ✅ |
| ERC-8183 Agentic Commerce | [`0x0747EEf0706327138c69792bF28Cd525089e4583`](https://testnet.arcscan.app/address/0x0747EEf0706327138c69792bF28Cd525089e4583) | ✅ |
| USDC | [`0x3600000000000000000000000000000000000000`](https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000) | ✅ |
| AgentTreasury | [`0x32faE7187a00f096B0536Ad4872fb324Bae39671`](https://testnet.arcscan.app/address/0x32faE7187a00f096B0536Ad4872fb324Bae39671) | ✅ |

## Deploy & Verify AgentTreasury

```bash
# 1. Set your testnet private key in .env.local
echo "AGENT_PRIVATE_KEY=0xYOUR_KEY_HERE" >> .env.local

# 2. Deploy + auto-verify in one command
npx hardhat run scripts/deploy.ts --network arcTestnet

# 3. Verify on ArcScan (replace ADDRESS)
npx hardhat verify --network arcTestnet ADDRESS 0x3600000000000000000000000000000000000000
```

Or use the all-in-one script:
```bash
bash scripts/deploy-and-verify.sh
```

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for manual verification steps.

## Deployment

### Vercel (Frontend)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/annguyenNous/arc-agent-treasury)

```bash
# Deploy to Vercel
vercel login
vercel deploy --prod
```

Environment variables for Vercel:
| Variable | Value |
|----------|-------|
| NEXT_PUBLIC_TREASURY_ADDRESS | `0x32faE7187a00f096B0536Ad4872fb324Bae39671` |
| NEXT_PUBLIC_ARC_RPC | `https://rpc.testnet.arc.network` |
| NEXT_PUBLIC_WC_PROJECT_ID | Your WalletConnect project ID |

### Smart Contracts (ARC Testnet)

See "Deploy & Verify AgentTreasury" section above.

## Getting Started

```bash
# Clone and install
git clone https://github.com/annguyenNous/arc-agent-treasury.git
cd arc-agent-treasury
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev

# Run AI agent
npm run agent:run

# Run multi-agent system
npx tsx scripts/run-agent.ts multi
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

## Safety Guardrails

| Guardrail | Value |
|-----------|-------|
| Max single-action size | 10% of portfolio |
| Auto-execute threshold | Below 10 USDC |
| Human approval required | All transfers/swaps |
| Human approval required | Any action >100 USDC |
| Minimum gas reserve | 1.0 USDC |

## Automated Payment Execution (Gelato / Chainlink)

The contract implements `IAutomationCompatible` for automated payment execution:

| Function | Description |
|----------|-------------|
| `checkUpkeep(bytes)` | Returns ready payment IDs (off-chain, free) |
| `performUpkeep(bytes)` | Executes ready payments (on-chain, gas) |
| `getReadyPayments()` | View: list payments ready for execution |

```bash
# Verify automation interface works
npx tsx scripts/setup-gelato.ts
```

Register with [Gelato Network](https://app.gelato.network) or
[Chainlink Automation](https://automation.chainlink.dev) for hands-free
scheduled payment execution.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/treasury?action=health | Health check |
| GET | /api/treasury?action=portfolio | Live balances |
| GET | /api/treasury?action=config | Agent config |
| POST | /api/treasury | Control actions (init, run, snapshot) |

## Grant Alignment

This project aligns with Circle's ARC Network priorities:
- ✅ AI Agent Economy (ERC-8004 + ERC-8183 native support)
- ✅ USDC as native gas token
- ✅ Real-world financial use cases
- ✅ Sub-second finality for real-time operations
- ✅ Cross-chain via CCTP

## License

MIT
