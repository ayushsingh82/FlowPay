# @flowpay/sdk

The TypeScript SDK for [FlowPay](../README.md) — the "three calls" the pitch
promises, built on the official [`@mysten/sui`](https://www.npmjs.com/package/@mysten/sui)
SDK. Every write returns a real `Transaction` (PTB) you can sign with any wallet.

```ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { FlowPayClient, TESTNET } from '@flowpay/sdk';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
const flowpay = new FlowPayClient({ suiClient, deployment: TESTNET });

flowpay.createVault();                       // → Transaction
flowpay.deposit({ coinType, vault, coin });  // → Transaction
flowpay.pay({ soldType, merchantType, merchant, targetUsd, soldDecimals, vault }); // → Transaction
await flowpay.watchVault(vault, coinType);   // → on-chain sCoin balance
await flowpay.querySpends();                 // → recent SpendEvents
```

## The calls

| Method | Builds | On-chain target |
|---|---|---|
| `createVault()` | PTB | `flow_vault::create` |
| `deposit({coinType, vault, coin})` | PTB | `flow_vault::deposit<T>` |
| `pay({...})` | PTB | `smart_router::spend_entry<Sold, Merchant>` — the atomic borrow→DeepBook route→settle→cashback→emit |
| `watchVault(vault, coinType)` | read | dev-inspects `flow_vault::scoin_balance<T>` |
| `querySpends(limit?)` | read | `queryEvents` for `smart_router::SpendEvent` |

USD amounts are passed as human numbers (e.g. `targetUsd: 20`) and converted to
the protocol's `usd_e6` micro-USD unit via `toUsdE6`.

## Deployment config

The SDK reads `../contracts/deployments/testnet.json` (written by
`contracts/deploy.sh`) at import time. Before you deploy, it falls back to a
**placeholder** deployment so transactions can still be *built* and inspected;
read methods (`watchVault`, `querySpends`) throw a clear "deploy first" error
until a real deployment is present.

```bash
# deploy, which writes the config the SDK consumes
cd ../contracts && ./deploy.sh
```

## Develop

```bash
bun install
bun test              # transaction-construction tests (offline)
bunx tsc --noEmit     # typecheck
bun run examples/spend.ts   # build + print the atomic spend PTB (offline)
```
