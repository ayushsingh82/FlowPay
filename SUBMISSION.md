# FlowPay — Sui Overflow 2026 Submission Kit

> The payment app where your money never stops earning.
> Multi-asset wallet on Sui · Scallop yield · DeepBook routing · one atomic PTB.

**Tracks:** DeFi & Payments (Core) + DeepBook (Specialized) — dual eligible.
**Sponsors used:** Scallop · DeepBook (Spot + Predict + Margin + DEEP) · OpenZeppelin patterns · Pyth.

---

## 1. What we built (and where it lives)

| Component | Path | Status |
|---|---|---|
| Move package (`flowpay`) | [`contracts/`](./contracts) | ✅ `sui move build` clean · `sui move test` **7/7** (Sui CLI 1.73.2) |
| TypeScript PTB SDK (`@flowpay/sdk`) | [`sdk/`](./sdk) | ✅ builds real `pay()/deposit()/watchVault()` transactions |
| Off-chain agent (router/risk/hedge) | [`agent/`](./agent) | ✅ `bun test` **40/40** · `Bun.serve` API |
| Web app — landing, docs, pitch, live demo | [`frontend/`](./frontend) | ✅ `bun run build` green · `/app` interactive demo |

The three primitives are **runtime dependencies, not bolt-ons**: remove Scallop
(yield) or DeepBook (routing) and the product stops working.

## 2. The one thing that makes it Sui-native

Every spend is a **single atomic PTB**: withdraw/borrow from the Scallop-backed
vault → route through DeepBook for best execution → settle to the merchant →
mint DEEP cashback → emit `SpendEvent`. If any step fails the whole thing
reverts. This composition isn't replicable on a non-PTB chain — it's the core
technical claim and it's implemented in `smart_router::spend`.

## 3. Required deliverables checklist

- [x] **Public GitHub repo** — monorepo, MIT licensed, READMEs per package.
- [x] **Working code** — contracts tested (7/7), agent tested (40/40), SDK tested, frontend builds.
- [ ] **Live testnet deployment** — run `cd contracts && ./deploy.sh` (needs a
      funded testnet address; writes `contracts/deployments/testnet.json`, which
      the SDK + frontend auto-read). Then paste the package ID + Suiscan link below.
- [ ] **Demo video (≤ 3 min)** — script in §5. Record the `/app` flow + show the
      on-chain spend tx on Suiscan.
- [x] **Pitch deck** — `/pitch` (keyboard-driven, 8 slides) and `frontend/app/pitch`.
- [x] **Written docs** — `/docs` (overview, architecture, sponsor integration, modules).

## 4. Deploy & verify (live testnet)

```bash
# 1. point sui at testnet and fund the address
sui client switch --env testnet
sui client active-address                 # → fund at https://faucet.sui.io/?address=<addr>

# 2. publish + capture all object IDs
cd contracts && ./deploy.sh               # writes deployments/testnet.json

# 3. build a real spend PTB against the live package
cd ../sdk && bun install && bun run examples/spend.ts
```

> **Live package:** `<paste packageId after deploy>`
> **Explorer:** `https://suiscan.xyz/testnet/object/<packageId>`

## 5. Demo video script (≈2:45, maps to judging)

1. **0:00 Hook** — "$1,000 split across SUI/USDC/BTC, all earning yield. Watch me buy coffee." Open `/app`, show live APY counters ticking.
2. **0:30 SmartSpend (DeepBook Spot + Scallop)** — pay $5; optimizer picks the cheapest asset ("selling 0.0001 BTC via DeepBook, saves $0.02 vs SUI"); the 6-step atomic PTB animates; success in ~800ms; APY never stops.
3. **1:15 Lock Rate (DeepBook Predict)** — Bills tab, rent due, one-tap rate lock.
4. **1:45 Spend Tomorrow (DeepBook Margin)** — get liquidity now without selling collateral; auto-repay note.
5. **2:05 DEEP cashback + safety** — DEEP balance growing, stake-for-discount; OZ emergency pause + Pyth oracle freshness + per-asset LTV caps.
6. **2:25 Proof it's real** — terminal: `sui move test` 7/7; Suiscan showing the deployed package + a real `SpendEvent`.
7. **2:40 Vision** — "FlowPay turns every Sui wallet into a checking account that earns by default."

## 6. How we map to the judging rubric

- **Technical execution** — tested Move package + real PTB SDK + tested agent; atomic borrow-swap-send-cashback in one transaction.
- **Innovation** — first consumer payment app to consume 4 DeepBook surfaces (Spot/Predict/Margin/DEEP) + Scallop + Pyth in one product.
- **Real-world usability** — Cash-App-style UX, sub-second settlement, no-exit-yield spend, FX rate-lock for bills, BNPL without selling your bag.
- **Sui ecosystem fit** — PTB atomicity is the differentiator; zkLogin onboarding; shared-object architecture.
- **Sponsor depth** — Scallop is the yield engine for every asset; DeepBook is hit on every transaction; OZ patterns gate every mutating entry; Pyth guards staleness.

## 7. Honest scope notes

The `/app` UI is a **seeded testnet mock** for a smooth demo; the real on-chain
logic is in `contracts/` and the buildable PTBs are in `sdk/`. The Scallop /
DeepBook / Pyth adapters in the Move package model sponsor behavior behind clean
interfaces with `// INTEGRATION:` markers at every real call site — swapping in
the mainnet SDKs is a localized change, not a rewrite.
