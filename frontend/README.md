# Vela · frontend

The single Next.js app that powers every public surface of [Vela](../README.md) —
stock-collateralized credit lines on Robinhood Chain.

## Routes

| Path | Description |
|---|---|
| `/` | Landing page (hero, protocol, how-it-works, risk, developers, CTA) |
| `/docs` | Documentation site (overview, protocol, agent, contracts, integration, resources) |
| `/pitch` | Keyboard-driven 8-slide pitch deck (←/→ to navigate) |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/security` | Security disclosure / responsible disclosure |

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

Open:
- <http://localhost:3000>
- <http://localhost:3000/docs>
- <http://localhost:3000/pitch>

## Build

```bash
npm run build
npm start
```

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 + shadcn/ui + Radix primitives
- viem + wagmi + RainbowKit (wallet connection, ready for borrow/repay UI)
- Lucide icons, Instrument Sans/Serif + JetBrains Mono typography

## Adding a doc page

Each docs page is a key in the `pages` registry inside
[`app/docs/[slug]/page.tsx`](./app/docs/%5Bslug%5D/page.tsx). To add a new doc,
append a new entry there and a matching sidebar link in
[`app/docs/_components/shell.tsx`](./app/docs/_components/shell.tsx).
