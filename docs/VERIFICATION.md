# Contract Verification Guide

## AgentTreasury.sol - ARC Testnet

### Method 1: Manual Verification on ArcScan

1. Go to: https://testnet.arcscan.app

2. Search for your contract address

3. Click "Contract" tab → "Verify and Publish"

4. Fill in:
   - **Contract Name**: AgentTreasury
   - **Compiler**: v0.8.20+commit.3c364619
   - **Optimization**: Yes (200 runs)
   - **EVM Version**: default

5. Paste the flattened source code (see below)

6. Click "Verify and Publish"

### Method 2: Flatten and Verify

Run this command to flatten the contract:

```bash
npx hardhat flatten contracts/AgentTreasury.sol > flattened.sol
```

Then paste the flattened.sol content into ArcScan verification form.

### Contract Details

- **Network**: ARC Testnet (Chain ID: 5042002)
- **Compiler**: Solidity 0.8.20
- **Optimization**: Enabled (200 runs)
- **Via IR**: Enabled

### Constructor Arguments

The AgentTreasury contract takes one constructor argument:

```
_USDC: 0x3600000000000000000000000000000000000000
```

### Deployed Addresses

Update this section after deployment:

| Contract | Address | Verified |
|----------|---------|----------|
| AgentTreasury | `0x...` | ⏳ Pending |

### Troubleshooting

If verification fails:
1. Make sure compiler version matches exactly
2. Check optimization settings match
3. Ensure all imports are included
4. Try flattening the contract first

### Links

- [ArcScan Explorer](https://testnet.arcscan.app)
- [ARC Testnet RPC](https://rpc.testnet.arc.network)
- [USDC Faucet](https://faucet.circle.com)
