import { NextResponse } from "next/server";

// Real, live Scallop lending-market supply APYs (mainnet) from Scallop's own
// public indexer — the same data source their SDK/app uses. No API key, no
// @mysten/sui dependency (so it can't collide with the app's v2 stack).
//
// Scallop has no testnet deployment, so these are mainnet *reference* rates:
// the actual yield a deposit of each asset would earn right now. We read them
// server-side and surface them in the dashboard instead of inventing APYs.
const SCALLOP_MARKET_URL = "https://sdk.api.scallop.io/api/market/migrate";

// Demo asset symbol -> Scallop pool symbol.
const POOL_FOR: Record<string, string> = {
  SUI: "SUI",
  USDC: "USDC",
  BTC: "sbwBTC",
  ETH: "sbETH",
};

interface ScallopPool {
  symbol: string;
  supplyApy: number;
}

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(SCALLOP_MARKET_URL, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`scallop indexer ${res.status}`);
    const data = (await res.json()) as { updatedAt?: string; pools?: ScallopPool[] };

    const bySymbol = new Map((data.pools ?? []).map((p) => [p.symbol, p]));
    const rates: Record<string, number> = {};
    for (const [demoSymbol, poolSymbol] of Object.entries(POOL_FOR)) {
      const pool = bySymbol.get(poolSymbol);
      if (pool && typeof pool.supplyApy === "number") rates[demoSymbol] = pool.supplyApy;
    }

    return NextResponse.json(
      { source: "scallop", network: "mainnet", updatedAt: data.updatedAt ?? null, rates },
      { headers: { "cache-control": "public, max-age=60" } },
    );
  } catch (e) {
    // Graceful fallback: the client keeps its seeded APYs if this fails.
    return NextResponse.json({
      source: "scallop",
      network: "mainnet",
      updatedAt: null,
      rates: {},
      error: e instanceof Error ? e.message : "fetch failed",
    });
  }
}
