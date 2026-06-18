# flowpay-agent

Off-chain **risk-monitoring + rate-routing** service for [FlowPay](../README.md),
the multi-asset consumer payment wallet on Sui (Sui Overflow 2026).

FlowPay holds a *basket* of assets (SUI, USDC, BTC, ETH, DEEP) that earn yield
on **Scallop** and spend through **DeepBook**. This service is the off-chain
"brains" that the Move modules and PWA call into:

| Module | Mirrors on-chain | What it does |
|---|---|---|
| `src/router.ts` | `SmartRouter` | **SmartSpend optimizer** — picks the cheapest asset to sell for a payment, minimizing spread + price impact + forfeited Scallop yield + gas. |
| `src/risk.ts` | `BorrowGuard` | **Risk monitor** — computes LTV / health factor, detects Pyth oracle staleness, recommends the OZ-pattern emergency pause. |
| `src/hedge.ts` | `HedgeManager` | **Hedge advisor** — given an upcoming bill, recommends a DeepBook **Predict** rate-lock. |
| `src/server.ts` | — | Thin `Bun.serve` HTTP layer exposing the three cores as JSON endpoints. |

The cores are **pure, deterministic, and fully unit-tested**. All external data
(chain state, DeepBook book, Scallop APY, Pyth feeds) is fetched through a single
adapter interface (`src/adapters.ts`) so the service runs standalone on seeded
fixtures (`src/fixtures.ts`).

## Layout

```
agent/
├── src/
│   ├── types.ts      # Domain models (strict, shared)
│   ├── router.ts     # SmartSpend rate router (pure)
│   ├── risk.ts       # LTV / health / oracle-staleness monitor (pure)
│   ├── hedge.ts      # DeepBook Predict hedge advisor (pure)
│   ├── adapters.ts   # MarketDataSource interface + FixtureAdapter
│   ├── fixtures.ts   # Seeded demo data ($1,000 SUI/USDC/BTC basket)
│   └── server.ts     # Bun.serve HTTP service + request/response types
└── test/             # bun:test suites (router, risk, hedge, server)
```

## Run it

> **Tooling:** this project uses **bun** only (no node/npm).

```bash
bun install        # install dev deps (typescript, bun-types)
bun test           # run all unit tests
bun run typecheck  # bunx tsc --noEmit (strict)
bun run dev        # start with --watch on PORT (default 3001)
bun run start      # start once
```

## Endpoints

All POST bodies are JSON. Responses are JSON. `userId` resolves a seeded basket
via the fixture adapter; you may instead pass data inline.

### `GET /health`
```json
{ "status": "ok", "service": "flowpay-agent" }
```

### `POST /route` — SmartSpend optimizer
Request (`RouteApiRequest`):
```json
{ "userId": "demo-user", "merchantToken": "USDC", "amountUsd": 20,
  "gasUsd": 0.01, "opportunityHorizonDays": 7 }
```
You can substitute `"basket": { ...UserBasket }` for `userId`.
Response (`RouteResult`): the chosen `best` candidate, every scored
`candidate` (cheapest first) with a full cost breakdown, and a human `rationale`,
e.g. `"Sell 20.01 USDC no DeepBook hop (same token) for $0.0215 total cost saving $0.0065 vs selling BTC."`

### `POST /risk` — Risk monitor
Request (`RiskApiRequest`):
```json
{ "userId": "demo-user", "maxFeedAgeSec": 60, "warnLtv": 0.7 }
```
Or inline: `{ "obligations": [...], "feeds": [...] }`.
Response (`RiskReport`): `alerts[]` (LTV warning/liquidation, oracle stale,
pause-recommended), a boolean `shouldPause`, and per-obligation `health`
(LTV + health factor).

### `POST /hedge` — Hedge advisor
Request (`HedgeRequest`):
```json
{ "bill": { "billId": "rent", "amount": 40000, "currency": "USDC",
            "dueDate": "2026-07-10" },
  "asOf": "2026-06-18", "impliedVol": 0.5, "predictPremiumPct": 0.012 }
```
Response (`HedgeRecommendation`): `action` (`LOCK_RATE` | `MONITOR` |
`NO_HEDGE`), `daysToDue`, `exposureUsd`, `estimatedHedgeCostUsd`, an `urgency`
score (0..1), and a `rationale`.

## Cost model (router)

Selling asset *X* to pay an `amountUsd` bill costs:

```
spread cost = amountUsd * halfSpreadBps / 10_000
impact cost = amountUsd * impactCoeffBps / 10_000 * min(amountUsd/depthUsd, 1)
yield  cost = amountUsd * (apy/100) * (horizonDays/365)   # forfeited Scallop yield
gas    cost = flat gasUsd
```

Paying in the merchant's own token incurs no DeepBook hop (spread + impact = 0).
The router minimizes the sum and tie-breaks deterministically.

## Where the real integrations plug in

Every external dependency lives behind `MarketDataSource` in `src/adapters.ts`.
To go live, implement that interface against the real stack and pass it to
`createHandler(...)` instead of `FixtureAdapter`. Search the source for
`// INTEGRATION:` markers:

| Adapter method | Real source |
|---|---|
| `getBasket` | Sui SDK — read `FlowVault` holdings + Scallop supply APY |
| `getMarkets` | DeepBook — level-2 book → half-spread, depth, impact coeff |
| `getObligations` | Scallop SDK — borrow obligations (collateral/debt) |
| `getFeeds` | Pyth — price + publish timestamp per asset |

The hedge advisor's `impliedVol` / `predictPremiumPct` come from **DeepBook
Predict** market state in production; the risk monitor's `shouldPause` would
drive the OZ-pattern emergency-pause entry on the Move side.
