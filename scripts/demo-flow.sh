#!/bin/bash
# ============================================
# ArcAgent Treasury - Demo Flow Script
# ============================================
# This script demonstrates the full flow for grant applications

set -e

echo "=========================================="
echo "  ArcAgent Treasury - Demo Flow"
echo "  ARC Testnet (Chain ID: 5042002)"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check environment
echo -e "${BLUE}[Step 1]${NC} Checking environment..."
if [ -z "$AGENT_PRIVATE_KEY" ]; then
    echo "Warning: AGENT_PRIVATE_KEY not set"
    echo "Please set it in .env.local"
fi

# Step 2: Install dependencies
echo -e "\n${BLUE}[Step 2]${NC} Installing dependencies..."
npm install

# Step 3: Compile contracts
echo -e "\n${BLUE}[Step 3]${NC} Compiling smart contracts..."
npx hardhat compile 2>/dev/null || echo "Note: Hardhat compilation requires setup"

# Step 4: Start development server
echo -e "\n${BLUE}[Step 4]${NC} Starting development server..."
echo -e "${YELLOW}Run: npm run dev${NC}"
echo ""

# Step 5: Demo flow
echo -e "${GREEN}=========================================="
echo "  Demo Flow (Manual Steps)"
echo "==========================================${NC}"
echo ""
echo "1. Open http://localhost:3000"
echo "2. Connect wallet (MetaMask)"
echo "   - Add ARC Testnet:"
echo "     Network: ARC Testnet"
echo "     RPC: https://rpc.testnet.arc.network"
echo "     Chain ID: 5042002"
echo "     Currency: USDC"
echo ""
echo "3. Get test USDC:"
echo "   - Visit https://faucet.circle.com"
echo "   - Request USDC on ARC Testnet"
echo ""
echo "4. Register AI Agent:"
echo "   - Go to /agents"
echo "   - Click 'Register Agent'"
echo "   - Fill in name and type"
echo "   - Submit transaction"
echo ""
echo "5. Create Job:"
echo "   - Go to /jobs"
echo "   - Click 'Create Job'"
echo "   - Set budget and description"
echo "   - Approve and fund escrow"
echo ""
echo "6. Schedule Payment:"
echo "   - Go to /payments"
echo "   - Click 'Add Payment'"
echo "   - Set recipient and amount"
echo "   - Execute payment"
echo ""
echo "7. Run AI Agent (optional):"
echo "   - Set ANTHROPIC_API_KEY in .env.local"
echo "   - Run: npm run agent:run"
echo ""
echo -e "${GREEN}=========================================="
echo "  Grant Demo Checklist"
echo "==========================================${NC}"
echo ""
echo "[ ] Wallet connected to ARC Testnet"
echo "[ ] USDC balance visible"
echo "[ ] Agent registered (ERC-8004 tx visible)"
echo "[ ] Job created (ERC-8183 tx visible)"
echo "[ ] Payment executed (USDC transfer visible)"
echo "[ ] All transactions on ArcScan explorer"
echo ""
echo "Explorer: https://testnet.arcscan.app"
echo "Faucet: https://faucet.circle.com"
