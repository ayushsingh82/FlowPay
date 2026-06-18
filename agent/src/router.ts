/**
 * SmartSpend rate router.
 *
 * Pure, deterministic core. Given a user's basket and a target payment, it
 * scores every holding that *could* fund the payment and picks the cheapest.
 *
 * Cost model for selling asset X to pay an `amountUsd` bill:
 *   spread cost  = amountUsd * (halfSpreadBps / 10_000)
 *   impact cost  = amountUsd * (impactCoeffBps / 10_000) * (amountUsd / depthUsd)
 *   yield cost   = amountUsd * (apy/100) * (horizonDays / 365)
 *   gas cost     = flat gasUsd
 *
 * If the merchant token is the same as the asset being sold, there is no
 * DeepBook hop, so spread + impact are zero (a direct transfer / no swap).
 *
 * INTEGRATION: spread/impact/depth come from seeded fixtures here. In
 * production they are read from DeepBook pool state (level-2 book) and Pyth
 * prices via the Sui SDK — see adapters.ts.
 */

import type {
  AssetHolding,
  RouteCandidate,
  RouteRequest,
  RouteResult,
  DeepBookMarket,
} from "./types.ts";

const BPS = 10_000;
const DEFAULT_GAS_USD = 0.01;
const DEFAULT_HORIZON_DAYS = 7;

/** Cost of crossing the DeepBook spread for `amountUsd` of notional. */
export function spreadCost(amountUsd: number, market: DeepBookMarket): number {
  return amountUsd * (market.halfSpreadBps / BPS);
}

/**
 * Linear price-impact cost. Impact grows with trade size relative to book
 * depth, so a $1000 trade into a $10k book costs proportionally more than a
 * $10 trade. Clamped at the full impact coefficient for trades >= depth.
 */
export function impactCost(amountUsd: number, market: DeepBookMarket): number {
  const depth = market.depthUsd > 0 ? market.depthUsd : amountUsd;
  const sizeRatio = Math.min(amountUsd / depth, 1);
  return amountUsd * (market.impactCoeffBps / BPS) * sizeRatio;
}

/** Opportunity cost of forfeiting Scallop yield over the horizon. */
export function yieldCost(
  amountUsd: number,
  apyPct: number,
  horizonDays: number,
): number {
  return amountUsd * (apyPct / 100) * (horizonDays / 365);
}

function findMarket(
  markets: DeepBookMarket[],
  symbol: AssetHolding["symbol"],
): DeepBookMarket | undefined {
  return markets.find((m) => m.symbol === symbol);
}

/**
 * Score one holding as a funding source. Returns a candidate with a full cost
 * breakdown, or marks it infeasible if the holding can't cover payment + costs.
 */
export function scoreCandidate(
  holding: AssetHolding,
  req: RouteRequest,
  markets: DeepBookMarket[],
): RouteCandidate {
  const gasCostUsd = req.gasUsd ?? DEFAULT_GAS_USD;
  const horizonDays = req.opportunityHorizonDays ?? DEFAULT_HORIZON_DAYS;
  const sameToken = holding.symbol === req.merchantToken;

  // No DeepBook hop when paying in the same token the user already holds.
  let spreadCostUsd = 0;
  let impactCostUsd = 0;
  if (!sameToken) {
    const market = findMarket(markets, holding.symbol);
    if (!market) {
      // No tradeable market for this asset -> cannot route through it.
      return {
        sellAsset: holding.symbol,
        amountIn: 0,
        spreadCostUsd: 0,
        impactCostUsd: 0,
        yieldCostUsd: 0,
        gasCostUsd,
        totalCostUsd: Number.POSITIVE_INFINITY,
        feasible: false,
      };
    }
    spreadCostUsd = spreadCost(req.amountUsd, market);
    impactCostUsd = impactCost(req.amountUsd, market);
  }

  const yieldCostUsd = yieldCost(
    req.amountUsd,
    holding.scallopApyPct,
    horizonDays,
  );
  const totalCostUsd =
    spreadCostUsd + impactCostUsd + yieldCostUsd + gasCostUsd;

  // Total USD we must source from this asset (payment + execution costs).
  const requiredUsd = req.amountUsd + spreadCostUsd + impactCostUsd + gasCostUsd;
  const availableUsd = holding.balance * holding.priceUsd;
  const feasible = holding.priceUsd > 0 && availableUsd >= requiredUsd;
  const amountIn = holding.priceUsd > 0 ? requiredUsd / holding.priceUsd : 0;

  return {
    sellAsset: holding.symbol,
    amountIn,
    spreadCostUsd,
    impactCostUsd,
    yieldCostUsd,
    gasCostUsd,
    totalCostUsd: feasible ? totalCostUsd : Number.POSITIVE_INFINITY,
    feasible,
  };
}

/**
 * Compute the optimal funding route for a payment.
 *
 * Deterministic tie-break: lowest totalCostUsd, then prefer paying in the
 * merchant token directly (no swap), then alphabetical by symbol — so the same
 * inputs always yield the same choice.
 */
export function route(
  req: RouteRequest,
  markets: DeepBookMarket[],
): RouteResult {
  const candidates = req.basket.holdings
    .map((h) => scoreCandidate(h, req, markets))
    .sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      if (a.totalCostUsd !== b.totalCostUsd) {
        return a.totalCostUsd - b.totalCostUsd;
      }
      const aSame = a.sellAsset === req.merchantToken ? 0 : 1;
      const bSame = b.sellAsset === req.merchantToken ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      return a.sellAsset.localeCompare(b.sellAsset);
    });

  const best = candidates.find((c) => c.feasible) ?? null;

  let rationale: string;
  if (!best) {
    rationale = `No holding can cover ${fmt(req.amountUsd)} to ${req.merchantToken} after costs.`;
  } else {
    const runnerUp = candidates.find(
      (c) => c.feasible && c.sellAsset !== best.sellAsset,
    );
    const swapNote =
      best.sellAsset === req.merchantToken
        ? "no DeepBook hop (same token)"
        : "via DeepBook spot";
    const saveNote = runnerUp
      ? ` saving ${fmt(runnerUp.totalCostUsd - best.totalCostUsd)} vs selling ${runnerUp.sellAsset}`
      : "";
    rationale = `Sell ${best.amountIn.toPrecision(4)} ${best.sellAsset} ${swapNote} for ${fmt(best.totalCostUsd)} total cost${saveNote}.`;
  }

  return { best, candidates, rationale };
}

function fmt(usd: number): string {
  return `$${usd.toFixed(4)}`;
}
