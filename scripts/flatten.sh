#!/bin/bash
# Script to flatten AgentTreasury.sol for verification

echo "=== Flattening AgentTreasury.sol ==="

# Create flattened version
npx hardhat flatten contracts/AgentTreasury.sol > contracts/AgentTreasury.flattened.sol 2>/dev/null

if [ -f "contracts/AgentTreasury.flattened.sol" ]; then
    echo "✓ Flattened contract created: contracts/AgentTreasury.flattened.sol"
    echo ""
    echo "=== Contract Details ==="
    echo "Contract Name: AgentTreasury"
    echo "Compiler: v0.8.20+commit.3c364619"
    echo "Optimization: Yes (200 runs)"
    echo "Via IR: Yes"
    echo ""
    echo "=== Constructor Arguments ==="
    echo "_USDC: 0x3600000000000000000000000000000000000000"
    echo ""
    echo "=== Next Steps ==="
    echo "1. Go to https://testnet.arcscan.app"
    echo "2. Search for your contract address"
    echo "3. Click Contract → Verify and Publish"
    echo "4. Paste the flattened source code"
    echo "5. Fill in compiler settings (see above)"
    echo "6. Click Verify"
else
    echo "✗ Failed to flatten contract"
fi
