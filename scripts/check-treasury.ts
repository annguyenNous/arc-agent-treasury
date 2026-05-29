import { createPublicClient, http, formatUnits, parseAbi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://rpc.testnet.arc.network';
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as Address;
const CHAIN = {
  id: 5042002,
  name: 'ARC Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
]);

const PRIVATE_KEY = '0x14a98443da62b60c8dcf67b6370735a601a94cb1e74e597781c1e19808defaab' as `0x${string}`;

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });

  const [balance, blockNumber] = await Promise.all([
    client.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    client.getBlockNumber(),
  ]);

  console.log(JSON.stringify({
    address: account.address,
    balance: formatUnits(balance, 6),
    balanceRaw: balance.toString(),
    blockNumber: blockNumber.toString(),
  }));
}

main().catch(e => { console.error(e.message); process.exit(1); });
