# FlowPay

> A payment wallet on Sui where idle balances earn yield and every spend routes
> through DeepBook for best execution.

FlowPay is a consumer-first payment wallet on Sui. The product vision: your idle
balance earns on **Scallop**, and every payment is routed through **DeepBook**'s
on-chain order book — composed atomically in a single Sui PTB.

Built for [Sui Overflow 2026](https://sui.io/overflow) — Core Track:
**DeFi & Payments**, also targeting the **DeepBook** specialized track.

---

## What's real vs. simulated (honest status — June 2026)

We think it's more useful to a judge to be precise about what executes on-chain
today versus what is demo scaffolding for the vision. Nothing below is dressed up.

**Real, on-chain, verifiable right now (Sui testnet):**

- ✅ **Real DeepBook v3 swap** — in `/app` → **SmartSpend**, connect a testnet
  wallet and run a genuine spot swap routed **SUI → DEEP → USDC** through two
  *whitelisted* DeepBook pools (`DEEP_SUI`, `DEEP_DBUSDC`) in **one atomic PTB**.
  Quotes are read live from the order book; the transaction is signed by your
  wallet and is verifiable on Suiscan. No DEEP pre-funding or BalanceManager
  needed — a faucet-funded wallet works end to end. Implemented with
  [`@mysten/deepbook-v3`](https://www.npmjs.com/package/@mysten/deepbook-v3) in
  [`frontend/lib/deepbook.ts`](./frontend/lib/deepbook.ts).
- ✅ **Real Scallop supply APYs** — the dashboard shows *live* Scallop mainnet
  supply rates, read server-side from Scallop's own indexer
  ([`frontend/app/api/scallop-apy/route.ts`](./frontend/app/api/scallop-apy/route.ts)).
  These are real reference yields, not invented numbers.
- ✅ **Real Scallop deposit (mainnet)** — in `/app` → **Earn**, supply SUI or
  USDC into Scallop and start earning. The deposit PTB is built server-side with
  the Scallop SDK ([`frontend/app/api/scallop-deposit-tx/route.ts`](./frontend/app/api/scallop-deposit-tx/route.ts)),
  bridged to the app's `@mysten/sui` 2.x, signed by your wallet, and executed on
  **mainnet** — you get an interest-bearing sCoin, verifiable on Suiscan. (Real
  money; Scallop is mainnet-only — use small amounts.)
- ✅ **Real wallet + chain reads** — Sui wallet connect via `@mysten/dapp-kit`
  and a live testnet balance read.
- ✅ **Deployed Move package + PTB SDK** — a self-contained Move package is
  published to testnet, and `@flowpay/sdk` builds real PTBs against it.

**Simulated (clearly labeled in-app), and why:**

- ⚠️ **Scallop borrow / no-exit-yield spend** — the *deposit* (supply) side is
  real on mainnet (above); borrowing against the position to spend without
  exiting yield is still roadmap.
- ⚠️ **Move package adapters** — the Move package's Scallop / DeepBook / Pyth
  "adapters" are local models so the package compiles and deploys standalone;
  they are **not** cross-package calls into the real protocols. The real
  DeepBook integration lives in the frontend SDK path above.
- ⚠️ **Lock Rate (Predict), Spend Tomorrow (Margin), DEEP cashback, the
  safety/oracle strip** — simulated UI over the intended architecture.

---

## Why this exists

Today's "stablecoin payment apps" make users pick: earn OR spend. Withdraw from
yield → lose APY. Manual swaps to pay merchants who want a different token.
Custodial apps (Cash App, Venmo) pay 0%.

FlowPay's thesis is that Sui's atomic PTBs let a payment *route through DeepBook*
and *touch a yield position* in one transaction — so a consumer wallet can keep
every dollar productive. The **real DeepBook swap** in this submission is the
first concrete proof of that routing claim.

## Monorepo layout

```
FlowPay/
├── frontend/     # Next.js app — landing, /app demo (real DeepBook swap), docs, pitch
├── contracts/    # Sui Move package (self-contained; deployed to testnet)
├── agent/        # Off-chain route/risk/hedge service (TypeScript, fixture-driven)
├── docs/         # Ideation, hackathon brief, sponsor maps
└── README.md     # You are here
```

The `frontend/` Next.js app hosts every public surface:

| Route | What it is |
|---|---|
| `/` | Marketing landing page |
| `/app` | Interactive app — **real DeepBook testnet swap** (SmartSpend) + live Scallop APYs (dashboard); other tabs are labeled simulations |
| `/docs` | Documentation |
| `/pitch` | Keyboard-driven pitch deck |
| `/privacy`, `/terms`, `/security` | Legal & responsible-disclosure |

## Quickstart

```bash
cd frontend
bun install
bun run dev      # http://localhost:3000
```

Then visit <http://localhost:3000/app>, open **SmartSpend**, connect a Sui wallet
on **testnet** (fund it at <https://faucet.sui.io/?network=testnet>), and run a
real swap. The success card links to the transaction on Suiscan.

Contracts: `cd contracts && sui move build && sui move test`.
Agent service: `cd agent && bun install && bun test`.

## Sponsor integration

| Sponsor | What's real today | Roadmap |
|---|---|---|
| **DeepBook** | Live v3 spot swap routed through two whitelisted testnet pools in one PTB, signed by the user's wallet; live order-book quotes | Predict (rate-lock), Margin (BNPL), DEEP cashback |
| **Scallop** | Real mainnet **deposit** (supply SUI/USDC → earns yield, wallet-signed) + live supply APYs in-app | `borrowQuick` for no-exit-yield spend |
| **OpenZeppelin** | Access-control / pause / oracle-staleness *patterns* in the Move package | Real adapter wiring |

## Track fit

- **DeFi & Payments (core)** — a payment that routes through DeepBook's order
  book on-chain, plus a real yield reference from Scallop.
- **DeepBook (specialized)** — the swap is a genuine `@mysten/deepbook-v3`
  integration against live testnet pools, not a mock.

## Live testnet deployment

A self-contained FlowPay Move package is published to **Sui Testnet** (it models
Scallop/DeepBook/Pyth behind local adapters so it builds standalone — see the
status section above).

| Object | ID |
|---|---|
| Package | `0x97b2010f17e28aa2ee1642940c78095df3dd7efaf46a206992974cc439168607` |
| OracleRegistry | `0xd8b25e4f4403cf7afe615497339b57f5986fa3f6d8757d53caec771ce2ac0465` |
| RiskParams | `0x76a1d8268befe4d238b1d285ad7f06492642813f60717eab5888ca71f7e63dc4` |
| CashbackTreasury | `0x3448315352cd62abf8e577a61de7a4eb415601ccf82f08cf1c0f4fa8bd2bceb8` |
| DexMarket (local model) | `0xda6980a0678554c3cc481e105cbad1c7376967964ab9566355008de2e19be15d` |
| LendingMarket (local model) | `0xde530fc05cd43832633b764b2d2b9cd3c3646a32be9f872a3bcfb75f452ec581` |

Package on the explorer:
`https://suiscan.xyz/testnet/object/0x97b2010f17e28aa2ee1642940c78095df3dd7efaf46a206992974cc439168607`

Full record: [`contracts/deployments/testnet.json`](./contracts/deployments/testnet.json)

## Background reading

- [`docs/hackathon.md`](./docs/hackathon.md) — Sui Overflow 2026 brief
- [`docs/idea-flowpay-v2.md`](./docs/idea-flowpay-v2.md) — chosen concept
- [`docs/deepbook-integration.md`](./docs/deepbook-integration.md) — DeepBook design notes

## License

MIT — see [LICENSE](./LICENSE).
