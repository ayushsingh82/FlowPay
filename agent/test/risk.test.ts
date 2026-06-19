import { test, expect, describe } from "bun:test";
import {
  computeLtv,
  computeHealthFactor,
  isStale,
  evaluateRisk,
} from "../src/risk.ts";
import type { Obligation, OracleFeed, RiskRequest } from "../src/types.ts";

const NOW = 1_700_000_000_000;

function freshFeeds(): OracleFeed[] {
  return [
    { symbol: "SUI", priceUsd: 1.2, publishedAtMs: NOW - 1_000 },
    { symbol: "USDC", priceUsd: 1.0, publishedAtMs: NOW - 2_000 },
  ];
}

describe("LTV + health factor math", () => {
  test("ltv = debt/collateral", () => {
    expect(computeLtv({ obligationId: "x", collateralUsd: 1000, debtUsd: 400, liquidationThreshold: 0.8 })).toBeCloseTo(0.4);
  });

  test("ltv infinite when collateral is zero but debt exists", () => {
    expect(computeLtv({ obligationId: "x", collateralUsd: 0, debtUsd: 1, liquidationThreshold: 0.8 })).toBe(Infinity);
  });

  test("health factor >= 1 is safe", () => {
    // collateral 1000 * 0.8 / debt 400 = 2.0
    expect(computeHealthFactor({ obligationId: "x", collateralUsd: 1000, debtUsd: 400, liquidationThreshold: 0.8 })).toBeCloseTo(2);
  });

  test("health factor < 1 means liquidatable", () => {
    // 1000*0.8/900 = 0.888
    expect(computeHealthFactor({ obligationId: "x", collateralUsd: 1000, debtUsd: 900, liquidationThreshold: 0.8 })).toBeLessThan(1);
  });

  test("no debt -> infinite health", () => {
    expect(computeHealthFactor({ obligationId: "x", collateralUsd: 1000, debtUsd: 0, liquidationThreshold: 0.8 })).toBe(Infinity);
  });
});

describe("oracle staleness", () => {
  test("fresh feed not stale", () => {
    expect(isStale({ symbol: "SUI", priceUsd: 1, publishedAtMs: NOW - 10_000 }, NOW, 60)).toBe(false);
  });
  test("old feed stale", () => {
    expect(isStale({ symbol: "SUI", priceUsd: 1, publishedAtMs: NOW - 120_000 }, NOW, 60)).toBe(true);
  });
});

describe("evaluateRisk orchestration", () => {
  const healthy: Obligation = {
    obligationId: "ob-healthy",
    collateralUsd: 1000,
    debtUsd: 400,
    liquidationThreshold: 0.8,
  };

  test("healthy position + fresh feeds => no alerts, no pause", () => {
    const req: RiskRequest = { obligations: [healthy], feeds: freshFeeds(), nowMs: NOW };
    const r = evaluateRisk(req);
    expect(r.shouldPause).toBe(false);
    expect(r.alerts).toHaveLength(0);
    expect(r.health[0]?.healthFactor).toBeCloseTo(2);
  });

  test("high LTV (warn band) emits warning but no pause", () => {
    const near: Obligation = { obligationId: "ob-near", collateralUsd: 1000, debtUsd: 720, liquidationThreshold: 0.8 };
    const req: RiskRequest = { obligations: [near], feeds: freshFeeds(), nowMs: NOW, warnLtv: 0.7 };
    const r = evaluateRisk(req);
    expect(r.shouldPause).toBe(false);
    expect(r.alerts.some((a) => a.code === "LTV_WARNING")).toBe(true);
  });

  test("liquidatable position => critical alert + pause", () => {
    const bad: Obligation = { obligationId: "ob-bad", collateralUsd: 1000, debtUsd: 900, liquidationThreshold: 0.8 };
    const req: RiskRequest = { obligations: [bad], feeds: freshFeeds(), nowMs: NOW };
    const r = evaluateRisk(req);
    expect(r.shouldPause).toBe(true);
    expect(r.alerts.some((a) => a.code === "LTV_LIQUIDATION_RISK")).toBe(true);
    expect(r.alerts.some((a) => a.code === "PROTOCOL_PAUSE_RECOMMENDED")).toBe(true);
  });

  test("stale oracle => critical alert + pause even if positions healthy", () => {
    const staleFeeds: OracleFeed[] = [
      { symbol: "SUI", priceUsd: 1.2, publishedAtMs: NOW - 600_000 }, // 10 min old
    ];
    const req: RiskRequest = { obligations: [healthy], feeds: staleFeeds, nowMs: NOW, maxFeedAgeSec: 60 };
    const r = evaluateRisk(req);
    expect(r.shouldPause).toBe(true);
    const stale = r.alerts.find((a) => a.code === "ORACLE_STALE");
    expect(stale).toBeDefined();
    expect(stale?.subject).toBe("SUI");
  });

  test("combined stale feed + bad LTV produces both critical alerts", () => {
    const bad: Obligation = { obligationId: "ob-bad", collateralUsd: 1000, debtUsd: 900, liquidationThreshold: 0.8 };
    const staleFeeds: OracleFeed[] = [{ symbol: "BTC", priceUsd: 65000, publishedAtMs: NOW - 300_000 }];
    const req: RiskRequest = { obligations: [bad], feeds: staleFeeds, nowMs: NOW, maxFeedAgeSec: 30 };
    const r = evaluateRisk(req);
    expect(r.shouldPause).toBe(true);
    expect(r.alerts.filter((a) => a.severity === "critical").length).toBeGreaterThanOrEqual(3);
  });
});
