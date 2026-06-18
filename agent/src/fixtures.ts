/**
 * Seeded demo data so the agent runs standalone without any chain connection.
 *
 * INTEGRATION: everything here is replaced by live reads in `adapters.ts`.
 * Values are chosen to make the demo flows from docs/idea-flowpay-v2.md work:
 * a $1,000 basket split across SUI / USDC / BTC.
 */

import type {
  DeepBookMarket,
  Obligation,
  OracleFeed,
  UserBasket,
} from "./types.ts";

/** Keyed by userId. */
export const fixtureBaskets: Record<string, UserBasket> = {
  "demo-user": {
    userId: "demo-user",
    holdings: [
      // ~$400 SUI, high APY -> expensive to sell (loses good yield).
      { symbol: "SUI", balance: 333.3, priceUsd: 1.2, scallopApyPct: 6.5 },
      // ~$300 USDC, low APY, deep & tight book -> usually cheapest to spend.
      { symbol: "USDC", balance: 300, priceUsd: 1.0, scallopApyPct: 3.0 },
      // ~$300 BTC, mid APY, but thinner book.
      { symbol: "BTC", balance: 0.004615, priceUsd: 65_000, scallopApyPct: 0.5 },
    ],
  },
};

/** DeepBook spot microstructure per asset. */
export const fixtureMarkets: DeepBookMarket[] = [
  { symbol: "SUI", halfSpreadBps: 5, depthUsd: 50_000, impactCoeffBps: 20 },
  { symbol: "USDC", halfSpreadBps: 1, depthUsd: 500_000, impactCoeffBps: 5 },
  { symbol: "BTC", halfSpreadBps: 8, depthUsd: 30_000, impactCoeffBps: 30 },
  { symbol: "ETH", halfSpreadBps: 7, depthUsd: 40_000, impactCoeffBps: 25 },
  { symbol: "DEEP", halfSpreadBps: 25, depthUsd: 5_000, impactCoeffBps: 80 },
];

/** Keyed by userId. One healthy obligation in the demo. */
export const fixtureObligations: Record<string, Obligation[]> = {
  "demo-user": [
    {
      obligationId: "ob-demo-1",
      collateralUsd: 1_000,
      debtUsd: 400,
      liquidationThreshold: 0.8,
    },
  ],
};

/**
 * Oracle feeds timestamped relative to `nowMs` so the demo shows fresh feeds.
 * (A stale feed is easy to construct in tests by passing an old timestamp.)
 */
export function fixtureFeeds(nowMs: number): OracleFeed[] {
  return [
    { symbol: "SUI", priceUsd: 1.2, publishedAtMs: nowMs - 2_000 },
    { symbol: "USDC", priceUsd: 1.0, publishedAtMs: nowMs - 1_000 },
    { symbol: "BTC", priceUsd: 65_000, publishedAtMs: nowMs - 3_000 },
  ];
}
