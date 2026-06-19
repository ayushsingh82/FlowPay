/**
 * Offline example: build the atomic FlowPay spend PTB and print it.
 *
 * Runs without a network or a deployed package (uses the resolved TESTNET
 * deployment, which falls back to the placeholder if you haven't deployed yet):
 *
 *   bun run examples/spend.ts
 */

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { FlowPayClient, TESTNET, toUsdE6 } from '../src/index.js';

const suiClient = new SuiJsonRpcClient({ network: 'testnet', url: getJsonRpcFullnodeUrl('testnet') });
const flowpay = new FlowPayClient({ suiClient, deployment: TESTNET });

console.log('FlowPay deployment:', TESTNET.network, '· package', TESTNET.packageId);
if (TESTNET.isPlaceholder) {
  console.log('(placeholder — run `cd contracts && ./deploy.sh` to deploy for real)\n');
}

const tx = flowpay.pay({
  soldType: '0x2::sui::SUI',
  merchantType: '0x2::sui::SUI',
  merchant: '0x000000000000000000000000000000000000000000000000000000000000beef',
  targetUsd: 20,
  soldDecimals: 9,
  vault: '0x000000000000000000000000000000000000000000000000000000000000cafe',
});

const data = tx.getData();
const moveCalls = data.commands.filter(
  (c): c is Extract<typeof c, { MoveCall: unknown }> => 'MoveCall' in c && c.MoveCall != null,
);

console.log(`Built a PTB with ${data.commands.length} command(s):`);
for (const c of moveCalls) {
  const mc = c.MoveCall;
  console.log(`  • ${mc.package}::${mc.module}::${mc.function}`);
  console.log(`    type args : [${(mc.typeArguments ?? []).join(', ')}]`);
  console.log(`    inputs    : ${(mc.arguments ?? []).length}`);
}
console.log(`\n$20 → usd_e6 = ${toUsdE6(20)}`);
console.log('\nThis PTB is ready to sign + execute with any wallet or keypair.');
