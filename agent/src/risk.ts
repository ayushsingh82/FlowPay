/**
 * Risk monitor — mirrors the on-chain BorrowGuard module off-chain.
 *
 * Pure functions compute LTV / health factor and detect oracle staleness; the
 * `evaluateRisk` orchestrator turns those into alerts and a pause decision.
 *
 * INTEGRATION: obligations come from Scallop SDK reads, feeds from Pyth. Here
 * they are seeded fixtures. The pause decision would, in production, drive a
 * call into the OZ-pattern emergency-pause entry on the Move side.
 */

import type {
  Obligation,
  OracleFeed,
  ObligationHealth,
  RiskAlert,
  RiskReport,
  RiskRequest,
} from "./types.ts";

const DEFAULT_MAX_FEED_AGE_SEC = 60;
const DEFAULT_WARN_LTV = 0.7;

/** Loan-to-value = debt / collateral. Returns Infinity if no collateral. */
export function computeLtv(ob: Obligation): number {
  if (ob.collateralUsd <= 0) {
    return ob.debtUsd > 0 ? Number.POSITIVE_INFINITY : 0;
  }
  return ob.debtUsd / ob.collateralUsd;
}

/**
 * Health factor = (collateral * liquidationThreshold) / debt.
 * >= 1 is safe, < 1 means the position is liquidatable. Infinity when no debt.
 */
export function computeHealthFactor(ob: Obligation): number {
  if (ob.debtUsd <= 0) return Number.POSITIVE_INFINITY;
  return (ob.collateralUsd * ob.liquidationThreshold) / ob.debtUsd;
}

/** True when a feed is older than `maxAgeSec` relative to `nowMs`. */
export function isStale(
  feed: OracleFeed,
  nowMs: number,
  maxAgeSec: number,
): boolean {
  const ageSec = (nowMs - feed.publishedAtMs) / 1000;
  return ageSec > maxAgeSec;
}

export function obligationHealth(ob: Obligation): ObligationHealth {
  return {
    obligationId: ob.obligationId,
    ltv: computeLtv(ob),
    healthFactor: computeHealthFactor(ob),
  };
}

/**
 * Evaluate all obligations and feeds, emitting alerts.
 *
 * Pause is recommended when any obligation is already liquidatable
 * (healthFactor < 1) OR when an oracle feed is stale — both are conditions
 * under which continuing to price/route trades is unsafe.
 */
export function evaluateRisk(req: RiskRequest): RiskReport {
  const maxFeedAgeSec = req.maxFeedAgeSec ?? DEFAULT_MAX_FEED_AGE_SEC;
  const warnLtv = req.warnLtv ?? DEFAULT_WARN_LTV;

  const alerts: RiskAlert[] = [];
  const health: ObligationHealth[] = [];
  let shouldPause = false;

  for (const ob of req.obligations) {
    const h = obligationHealth(ob);
    health.push(h);

    if (h.healthFactor < 1) {
      shouldPause = true;
      alerts.push({
        severity: "critical",
        code: "LTV_LIQUIDATION_RISK",
        subject: ob.obligationId,
        message: `Obligation ${ob.obligationId} is liquidatable: LTV ${pct(h.ltv)} >= threshold ${pct(ob.liquidationThreshold)} (health ${h.healthFactor.toFixed(2)}).`,
      });
    } else if (h.ltv >= warnLtv) {
      alerts.push({
        severity: "warning",
        code: "LTV_WARNING",
        subject: ob.obligationId,
        message: `Obligation ${ob.obligationId} approaching liquidation: LTV ${pct(h.ltv)} >= warn ${pct(warnLtv)}.`,
      });
    }
  }

  for (const feed of req.feeds) {
    if (isStale(feed, req.nowMs, maxFeedAgeSec)) {
      shouldPause = true;
      const ageSec = Math.round((req.nowMs - feed.publishedAtMs) / 1000);
      alerts.push({
        severity: "critical",
        code: "ORACLE_STALE",
        subject: feed.symbol,
        message: `Oracle feed ${feed.symbol} is stale: age ${ageSec}s > max ${maxFeedAgeSec}s. Pricing unsafe.`,
      });
    }
  }

  if (shouldPause) {
    alerts.push({
      severity: "critical",
      code: "PROTOCOL_PAUSE_RECOMMENDED",
      subject: "protocol",
      message:
        "One or more critical conditions detected. Recommend triggering OZ-pattern emergency pause.",
    });
  }

  return { alerts, shouldPause, health };
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}
