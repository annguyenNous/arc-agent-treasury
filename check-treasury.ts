import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import { arcTestnet, USDC_ADDRESS } from './src/config/chains';
import { USDC_ABI } from './src/contracts/abis';

async function main() {
  const pk = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(pk);
  console.log('Wallet Address:', account.address);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(process.env.NEXT_PUBLIC_ARC_RPC),
  });

  const blockNumber = await publicClient.getBlockNumber();
  console.log('Block Number:', blockNumber.toString());

  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [account.address as Address],
    });
    console.log('USDC Balance:', formatUnits(balance, 6));
  } catch (e: any) {
    console.log('USDC Balance Error:', e?.message || String(e));
  }

  try {
    const nativeBalance = await publicClient.getBalance({ address: account.address });
    console.log('Native Balance:', formatUnits(nativeBalance, 18), 'ARC');
  } catch (e: any) {
    console.log('Native Balance Error:', e?.message || String(e));
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
