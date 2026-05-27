#!/bin/bash
# Deploy and verify AgentTreasury on ARC Testnet
set -e

echo "=== AgentTreasury Deploy & Verify ==="

# Check .env.local
if [ -f .env.local ]; then
  source .env.local
fi

if [ -z "$AGENT_PRIVATE_KEY" ]; then
  echo "ERROR: AGENT_PRIVATE_KEY not set in .env.local"
  echo "Run: echo 'AGENT_PRIVATE_KEY=0xYOUR_KEY' >> .env.local"
  exit 1
fi

echo "Deploying AgentTreasury to ARC Testnet..."

# Deploy and capture output
OUTPUT=$(npx hardhat run scripts/deploy.ts --network arcTestnet 2>&1)
echo "$OUTPUT"

# Extract address from output
ADDRESS=$(echo "$OUTPUT" | grep -oP 'AgentTreasury deployed to: \K0x[a-fA-F0-9]{40}')

if [ -z "$ADDRESS" ]; then
  echo "ERROR: Could not extract deployed address from output"
  echo "Please verify manually:"
  echo "  npx hardhat verify --network arcTestnet <ADDRESS> 0x3600000000000000000000000000000000000000"
  exit 1
fi

echo ""
echo "Deployed at: $ADDRESS"
echo "Explorer: https://testnet.arcscan.app/address/$ADDRESS"
echo ""
echo "Verifying on ArcScan..."

npx hardhat verify --network arcTestnet "$ADDRESS" "0x3600000000000000000000000000000000000000"

echo ""
echo "=== Done! ==="
echo "Contract: https://testnet.arcscan.app/address/$ADDRESS"
echo "Update README.md with: | AgentTreasury | $ADDRESS | ✅ Verified |"
