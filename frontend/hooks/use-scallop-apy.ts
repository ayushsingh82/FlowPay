"use client";

import { useEffect, useState } from "react";
import type { AssetSymbol } from "@/lib/flowpay-demo";

export interface ScallopApyState {
  /** Live Scallop supply APY per asset, as a fraction (e.g. 0.0508 = 5.08%). */
  rates: Partial<Record<AssetSymbol, number>>;
  /** ISO timestamp from Scallop's indexer of when the rates were computed. */
  updatedAt: string | null;
  /** True once at least one real rate has loaded. */
  live: boolean;
}

/** Fetches real Scallop mainnet supply APYs from our /api/scallop-apy route. */
export function useScallopApy(): ScallopApyState {
  const [state, setState] = useState<ScallopApyState>({
    rates: {},
    updatedAt: null,
    live: false,
  });

  useEffect(() => {
    let alive = true;
    fetch("/api/scallop-apy")
      .then((r) => r.json())
      .then((d: { rates?: Record<string, number>; updatedAt?: string | null }) => {
        if (!alive) return;
        const rates = (d.rates ?? {}) as Partial<Record<AssetSymbol, number>>;
        setState({ rates, updatedAt: d.updatedAt ?? null, live: Object.keys(rates).length > 0 });
      })
      .catch(() => {
        /* keep seeded fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
