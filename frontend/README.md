# FlowPay · frontend

The single Next.js app that powers every public surface of
[FlowPay](../README.md) — the consumer multi-asset payment wallet on Sui where
idle balance auto-earns on Scallop and every spend routes through DeepBook in
one atomic PTB.

## Routes

| Path | Description |
|---|---|
| `/` | Landing page (hero, how-it-works, integrations, security, CTA) |
| `/app` | Interactive product demo — multi-asset dashboard, SmartSpend PTB, Lock Rate, Spend Tomorrow, DEEP cashback (seeded testnet mock) |
| `/docs` | Documentation site (overview, architecture, sponsor integration, modules) |
| `/pitch` | Keyboard-driven 8-slide pitch deck (←/→ to navigate) |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/security` | Security disclosure / responsible disclosure |

## Develop

```bash
bun install
bun run dev      # http://localhost:3000
```

Open:
- <http://localhost:3000>
- <http://localhost:3000/app>
- <http://localhost:3000/docs>
- <http://localhost:3000/pitch>

## Build

```bash
bun run build
bun start
```

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 + shadcn/ui + Radix primitives
- Instrument Sans/Serif + JetBrains Mono typography, Lucide icons

The `/app` demo is fully client-side and seeded — it simulates the SmartSpend
optimizer, atomic PTB execution, and live Scallop yield with mock data, clearly
labeled as a testnet mock. The real on-chain logic lives in
[`../contracts/`](../contracts) and the off-chain brains in
[`../agent/`](../agent).

## Adding a doc page

Each docs page is a key in the `pages` registry inside
[`app/docs/[slug]/page.tsx`](./app/docs/%5Bslug%5D/page.tsx). To add a new doc,
append a new entry there and a matching sidebar link in
[`app/docs/_components/shell.tsx`](./app/docs/_components/shell.tsx).
