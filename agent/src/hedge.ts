/**
 * Hedge advisor — DeepBook Predict rate-lock recommendations for upcoming bills.
 *
 * Pure core. Given a future bill and market conditions, decides whether the
 * user should LOCK_RATE now (buy a Predict binary that fixes today's FX rate),
 * MONITOR (too far out / cheap to wait), or NO_HEDGE (negligible exposure).
 *
 * The heuristic: exposure to adverse FX moves grows with notional, time to due,
 * and implied vol. We approximate worst-case drift over the horizon and compare
 * it to the cost of the Predict premium. If expected protection >> premium and
 * the bill is near-term, recommend locking.
 *
 * INTEGRATION: impliedVol and predictPremiumPct come from DeepBook Predict
 * market state. Here they default to seeded values.
 */

import type {
  HedgeRecommendation,
  HedgeRequest,
} from "./types.ts";

const DEFAULT_IMPLIED_VOL = 0.35;
const DEFAULT_PREDICT_PREMIUM_PCT = 0.012;
const MS_PER_DAY = 86_400_000;

/** Rough USD-equivalent notional for a bill. Stablecoins map ~1:1. */
function exposureUsd(amount: number, currency: HedgeRequest["bill"]["currency"]): number {
  // INTEGRATION: real impl prices `currency` via Pyth. For seeded fixtures we
  // treat USDC ~ $1 and other assets at a nominal demo price.
  const nominalPrice: Record<string, number> = {
    USDC: 1,
    SUI: 1.2,
    BTC: 65_000,
    ETH: 3_200,
    DEEP: 0.05,
  };
  const price = nominalPrice[currency] ?? 1;
  return amount * price;
}

export function daysBetween(asOfIso: string, dueIso: string): number {
  const a = Date.parse(asOfIso);
  const b = Date.parse(dueIso);
  return (b - a) / MS_PER_DAY;
}

/**
 * Expected adverse move over the horizon, as a fraction of notional, using a
 * simple sqrt-of-time vol scaling: vol_annual * sqrt(days/365).
 */
export function expectedAdverseMovePct(
  impliedVol: number,
  days: number,
): number {
  if (days <= 0) return 0;
  return impliedVol * Math.sqrt(days / 365);
}

export function advise(req: HedgeRequest): HedgeRecommendation {
  const impliedVol = req.impliedVol ?? DEFAULT_IMPLIED_VOL;
  const premiumPct = req.predictPremiumPct ?? DEFAULT_PREDICT_PREMIUM_PCT;
  const daysToDue = daysBetween(req.asOf, req.bill.dueDate);
  const exposure = exposureUsd(req.bill.amount, req.bill.currency);

  // Bills already due or in the past: nothing to hedge.
  if (daysToDue <= 0) {
    return {
      action: "NO_HEDGE",
      daysToDue,
      exposureUsd: exposure,
      estimatedHedgeCostUsd: 0,
      urgency: 0,
      rationale: "Bill is due now or overdue; pay directly via SmartSpend.",
    };
  }

  // Negligible exposure: not worth a Predict position.
  if (exposure < 25) {
    return {
      action: "NO_HEDGE",
      daysToDue,
      exposureUsd: exposure,
      estimatedHedgeCostUsd: 0,
      urgency: 0,
      rationale: `Exposure ${fmt(exposure)} too small to justify a hedge.`,
    };
  }

  const movePct = expectedAdverseMovePct(impliedVol, daysToDue);
  const expectedAdverseUsd = exposure * movePct;
  const hedgeCostUsd = exposure * premiumPct;

  // Protection ratio: expected adverse move relative to premium paid.
  // > 1 means the hedge protects more than it costs in expectation.
  const protectionRatio =
    hedgeCostUsd > 0 ? expectedAdverseUsd / hedgeCostUsd : Number.POSITIVE_INFINITY;

  // Urgency rises as the due date nears (within a ~60d window) and as the
  // protection ratio grows. Clamped to 0..1.
  const timeUrgency = clamp01(1 - daysToDue / 60);
  const valueUrgency = clamp01((protectionRatio - 1) / 2);
  const urgency = clamp01(0.5 * timeUrgency + 0.5 * valueUrgency);

  let action: HedgeRecommendation["action"];
  let rationale: string;
  if (protectionRatio >= 1.5 && daysToDue <= 45) {
    action = "LOCK_RATE";
    rationale = `Lock today's rate on ${fmt(exposure)} ${req.bill.currency} bill due in ${Math.round(daysToDue)}d: expected adverse move ${fmt(expectedAdverseUsd)} (${pct(movePct)}) outweighs Predict premium ${fmt(hedgeCostUsd)}.`;
  } else if (daysToDue > 45) {
    action = "MONITOR";
    rationale = `Bill due in ${Math.round(daysToDue)}d; far out. Monitor DeepBook Predict markets and revisit nearer the date.`;
  } else {
    action = "MONITOR";
    rationale = `Premium ${fmt(hedgeCostUsd)} vs expected adverse move ${fmt(expectedAdverseUsd)} (ratio ${protectionRatio.toFixed(2)}); hedge not yet worthwhile. Monitor.`;
  }

  return {
    action,
    daysToDue,
    exposureUsd: exposure,
    estimatedHedgeCostUsd: action === "LOCK_RATE" ? hedgeCostUsd : 0,
    urgency,
    rationale,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function fmt(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(2)}%`;
}
