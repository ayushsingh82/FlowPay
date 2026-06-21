# FlowPay — Sui Overflow 2026 Submission Kit

> A payment wallet on Sui where idle balances earn yield and every spend routes
> through DeepBook for best execution.

**Tracks:** DeFi & Payments (core) + DeepBook (specialized).
**Sponsors used:** DeepBook (real v3 testnet swap) · Scallop (real mainnet deposit + live APY data) · OpenZeppelin patterns.

---

## 1. The headline: a real DeepBook swap you can verify

Open `/app` → **SmartSpend**, connect a Sui wallet on **testnet**, and run a swap.
It is a genuine on-chain DeepBook v3 trade — **not** a simulation:

- Routes **SUI → DEEP → USDC** through two *whitelisted* DeepBook testnet pools
  (`DEEP_SUI`, `DEEP_DBUSDC`) in a **single atomic PTB**.
- Quotes are read live from the order book (`getQuoteQuantityOut` /
  `getBaseQuantityOut`); the PTB is signed by the user's wallet via
  `@mysten/dapp-kit` and submitted to testnet.
- No DEEP pre-funding and no BalanceManager setup — a faucet-funded wallet runs
  the whole route, because whitelisted pools charge zero protocol fee.
- The success card links the transaction on Suiscan.

Code: [`frontend/lib/deepbook.ts`](./frontend/lib/deepbook.ts) (route + PTB
builder), [`frontend/components/app/deepbook-swap.tsx`](./frontend/components/app/deepbook-swap.tsx) (UI).

## 2. What's real vs. simulated (read this)

We separate genuinely on-chain functionality from demo scaffolding, on purpose.

| Capability | Status |
|---|---|
| DeepBook v3 spot swap (testnet, wallet-signed, atomic PTB) | ✅ **Real** |
| Real Scallop **deposit** on mainnet (`/app` → Earn) — supply SUI/USDC, earns yield, wallet-signed | ✅ **Real** |
| Live Scallop mainnet supply APYs in the dashboard | ✅ **Real** (read-only, from Scallop's indexer) |
| Sui wallet connect + live testnet balance | ✅ **Real** |
| Move package deployed to testnet + PTB SDK | ✅ **Real** (self-contained package) |
| Scallop **borrow** against position (no-exit-yield spend) | ⚠️ Roadmap |
| Move package Scallop/DeepBook/Pyth adapters | ⚠️ Local models, not cross-package calls (so the package builds standalone) |
| Lock Rate (Predict), Spend Tomorrow (Margin), DEEP cashback, safety strip | ⚠️ Simulated UI over the architecture |

On Scallop & networks: Scallop's SDK is **mainnet-only** ("testnet will give
errors because there is no package ID for the testnet"). So the DeepBook swap runs
on **testnet** (free) while the Scallop deposit runs on **mainnet** (real funds,
small amounts). The Scallop SDK is pinned to an older `@mysten/sui` (1.x), so we
isolate it server-side: a route builds the deposit PTB, and the browser bridges
it to the app's 2.x stack and signs it — see
[`frontend/app/api/scallop-deposit-tx/route.ts`](./frontend/app/api/scallop-deposit-tx/route.ts)
and [`frontend/components/app/scallop-deposit.tsx`](./frontend/components/app/scallop-deposit.tsx).

## 3. Required deliverables checklist

- [x] **Public GitHub repo** — monorepo, MIT licensed.
- [x] **Working code** — a real DeepBook testnet swap (above); Move package
      tested + deployed; agent unit-tested; frontend builds clean (`bun run build`).
- [x] **Live testnet deployment** — self-contained Move package on testnet (§5),
      and a real wallet-signed DeepBook swap any judge can reproduce in `/app`.
- [ ] **Demo video (≤ 3 min)** — script in §6.
- [x] **Pitch deck** — `/pitch`.
- [x] **Written docs** — `/docs` + this kit.

## 4. Run the real swap (≈1 min)

```bash
cd frontend && bun install && bun run dev      # http://localhost:3000/app
```

1. Open **SmartSpend**, click **Connect** (use a wallet set to **testnet**).
2. Fund the wallet: <https://faucet.sui.io/?network=testnet>.
3. Enter ~0.5 SUI, pick **USDC**, and **Swap on DeepBook**.
4. Approve in the wallet → the success card links the tx on Suiscan.

## 5. Deploy & verify (Move package)

```bash
sui client switch --env testnet
cd contracts && ./deploy.sh                # writes deployments/testnet.json
```

### Live on Sui Testnet

| What | Value |
|---|---|
| **Package** | `0x97b2010f17e28aa2ee1642940c78095df3dd7efaf46a206992974cc439168607` |
| Explorer | https://suiscan.xyz/testnet/object/0x97b2010f17e28aa2ee1642940c78095df3dd7efaf46a206992974cc439168607 |
| Publisher | `0xebacee9a4a7d21c5e7bb1a7d64a74b68648f9669663f4ba391cd33d7c4a0e1dc` |

The package is self-contained — it models Scallop/DeepBook/Pyth behind local
adapters so it builds and deploys without vendoring those packages. The *real*
DeepBook integration is the frontend SDK path in §1.

## 6. Demo video script (≈2:30)

1. **0:00 Hook** — "A payment wallet where every spend routes through DeepBook.
   Watch a real one." Open `/app` → SmartSpend.
2. **0:20 Real swap** — connect testnet wallet, enter 0.5 SUI → USDC, show the
   live order-book quote, hit Swap, approve in wallet.
3. **0:55 Proof** — open the Suiscan link from the success card; show the PTB
   with the DeepBook pool calls.
4. **1:25 Real yield** — Earn tab: supply ~0.1 SUI into Scallop on mainnet,
   approve in wallet, open the Suiscan **mainnet** link; note the sCoin now
   earning. Dashboard shows the live "Live · Scallop mainnet" APYs.
5. **2:00 Honesty** — show the labeled simulated tabs (Lock Rate / Spend
   Tomorrow / cashback) as roadmap. "Real DeepBook routing on testnet, real
   Scallop yield on mainnet, today."

## 7. How we map to the rubric

- **Technical execution** — a real, atomic, wallet-signed DeepBook v3 PTB on
  testnet; live protocol data reads; a deployed Move package + PTB SDK.
- **Innovation** — a consumer payment framed around on-chain order-book routing,
  with a working swap to prove the core claim.
- **Real-world usability** — Cash-App-style UX; the swap works from a fresh
  faucet wallet with no DEEP/BalanceManager friction.
- **Sui ecosystem fit** — atomic PTB routing through DeepBook is the differentiator.
- **Honesty** — we label every simulated surface; the real parts are verifiable
  on-chain.
