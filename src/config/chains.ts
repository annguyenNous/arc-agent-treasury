import { defineChain } from 'viem';

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'ARC Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

// ============================================
// CONTRACT ADDRESSES (ARC Testnet)
// ============================================

// ERC-8004 Agent Identity
export const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const;
export const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713' as const;
export const VALIDATION_REGISTRY = '0x8004Cb1BF31DAf7788923b405b754f57acEB4272' as const;

// ERC-8183 Agentic Commerce
export const AGENTIC_COMMERCE = '0x0747EEf0706327138c69792bF28Cd525089e4583' as const;

// AgentTreasury
export const AGENT_TREASURY = '0x32faE7187a00f096B0536Ad4872fb324Bae39671' as const;

// USDC on ARC Testnet (native gas token)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;

// URLs
export const EXPLORER_URL = 'https://testnet.arcscan.app';
export const FAUCET_URL = 'https://faucet.circle.com';
export const RPC_URL = 'https://rpc.testnet.arc.network';
