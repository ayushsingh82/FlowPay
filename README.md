# FlowPay

> The payment app where your money never stops earning.
> Hold a basket of assets on Sui, earn yield on Scallop, spend through DeepBook — atomic in one PTB.

FlowPay is a consumer-first payment wallet on Sui. Your idle balance auto-earns
on **Scallop**, every spend routes through **DeepBook** for best execution, and
the whole flow — borrow, swap, send — happens inside a single Sui PTB.

Built for [Sui Overflow 2026](https://sui.io/overflow) — Core Track:
**DeFi & Payments**, with deep integration into the **DeepBook** specialized track.

---

## Why this exists

Today's "stablecoin payment apps" make users pick: earn OR spend. Withdraw
from yield → lose APY. Manual swaps to pay merchants who want a different
token. Self-custodial wallets are scary; custodial apps (Cash App, Venmo)
earn 0%.

FlowPay collapses the gap with three primitives that only Sui can compose
atomically:

- **Scallop** — every idle dollar auto-earns; borrow against deposits to spend
  without exiting your yield position.
- **DeepBook** — every transaction routes through the orderbook; **Predict**
  lets users lock FX rates on upcoming bills; **Margin** powers "spend tomorrow"
  BNPL without selling collateral.
- **OpenZeppelin patterns** — battle-tested vault, access-control, and emergency
  pause patterns adapted for Sui Move.

The result: a Cash-App-style UX where every dollar is working DeFi underneath.

## Monorepo layout

```
FlowPay/
├── frontend/     # Next.js app — landing, docs, pitch
├── contracts/    # Sui Move modules (FlowVault, SmartRouter, BorrowGuard, …)
├── agent/        # Risk-monitoring + rate-routing service (TypeScript)
├── docs/         # Source-of-truth ideation, hackathon brief, sponsor maps
└── README.md     # You are here
```

The `frontend/` Next.js app hosts every public surface:

| Route | What it is |
|---|---|
| `/` | Marketing landing page |
| `/docs` | Documentation (overview, architecture, sponsor integration, build plan) |
| `/pitch` | Keyboard-driven pitch deck |
| `/privacy`, `/terms`, `/security` | Legal & responsible-disclosure |

`contracts/` and `agent/` are skeleton folders ready for the implementation
to drop in over the hackathon window.

## Quickstart

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

Then visit:
- <http://localhost:3000> — landing
- <http://localhost:3000/docs> — docs
- <http://localhost:3000/pitch> — pitch deck

## Sponsor integration

| Sponsor | Role | Depth |
|---|---|---|
| **Scallop** | Lending engine — every deposit auto-earns; borrow against position powers no-exit-yield spend | 🟢 Core |
| **DeepBook** | Spot routing on every payment; Predict for rate-lock; Margin for BNPL; DEEP cashback | 🟢 Core (4 primitives) |
| **OpenZeppelin** | Vault standards, access control, emergency pause, oracle staleness guards | 🟢 Core |

Dual eligible for **DeFi & Payments core prize** and the **DeepBook specialized
$70K pool**.

## How FlowPay aligns with the track judging criteria

- **Real-world payments** — every flow (peer send, merchant pay, subscription,
  remittance) settles in <1s on testnet with one atomic PTB.
- **DeFi depth** — Scallop + DeepBook are runtime dependencies, not optional
  bolt-ons; remove either and the product breaks.
- **Sui-native** — atomic PTBs are the differentiator. The "borrow + swap +
  send + emit" flow we use isn't replicable on any other chain.
- **Consumer-grade UX** — zkLogin onboarding, contact-list sends, QR scan
  pay, live APY counters; designed to be usable by people who don't know
  what a stablecoin is.

## Prize buckets in scope

| Bucket | Why FlowPay qualifies |
|---|---|
| DeFi & Payments — 1st place ($30K) | OZ-aligned safety story, full payments+DeFi loop |
| DeepBook specialized pool ($70K) | 4 DeepBook primitives used on every transaction |
| Scallop bonus (3rd-place sponsor) | Scallop is the yield engine for every supported asset |
| University award ($2.5K × 10) | If applicable to team |

## Background reading

The `docs/` folder is the source of truth for the project's why and what:

- [`docs/hackathon.md`](./docs/hackathon.md) — Sui Overflow 2026 brief
- [`docs/top3-ideas.md`](./docs/top3-ideas.md) — comparison of the 3 finalist ideas
- [`docs/idea-flowpay-v2.md`](./docs/idea-flowpay-v2.md) — chosen concept one-pager
- [`docs/deepbook-integration.md`](./docs/deepbook-integration.md) — all the ways DeepBook plugs in
- [`docs/ideas-defi-payments.md`](./docs/ideas-defi-payments.md) — long-form idea pool

## License

MIT — see [LICENSE](./LICENSE).
