import { test, expect, describe } from "bun:test";
import { advise, daysBetween, expectedAdverseMovePct } from "../src/hedge.ts";
import type { HedgeRequest } from "../src/types.ts";

describe("hedge primitives", () => {
  test("daysBetween computes calendar days", () => {
    expect(daysBetween("2026-06-18", "2026-06-28")).toBeCloseTo(10);
  });
  test("adverse move scales with sqrt of time", () => {
    const a = expectedAdverseMovePct(0.4, 30);
    const b = expectedAdverseMovePct(0.4, 120); // 4x time -> 2x move
    expect(b / a).toBeCloseTo(2, 4);
  });
  test("zero days => zero move", () => {
    expect(expectedAdverseMovePct(0.4, 0)).toBe(0);
  });
});

describe("hedge advisor recommendations", () => {
  test("near-term sizeable bill with high vol => LOCK_RATE", () => {
    const req: HedgeRequest = {
      bill: { billId: "rent", amount: 40_000, currency: "USDC", dueDate: "2026-07-10" },
      asOf: "2026-06-18",
      impliedVol: 0.5,
      predictPremiumPct: 0.01,
    };
    const rec = advise(req);
    expect(rec.action).toBe("LOCK_RATE");
    expect(rec.estimatedHedgeCostUsd).toBeGreaterThan(0);
    expect(rec.urgency).toBeGreaterThan(0);
  });

  test("far-future bill => MONITOR", () => {
    const req: HedgeRequest = {
      bill: { billId: "tuition", amount: 10_000, currency: "USDC", dueDate: "2026-12-01" },
      asOf: "2026-06-18",
      impliedVol: 0.4,
    };
    const rec = advise(req);
    expect(rec.action).toBe("MONITOR");
    expect(rec.estimatedHedgeCostUsd).toBe(0);
  });

  test("overdue bill => NO_HEDGE", () => {
    const req: HedgeRequest = {
      bill: { billId: "late", amount: 500, currency: "USDC", dueDate: "2026-06-01" },
      asOf: "2026-06-18",
    };
    const rec = advise(req);
    expect(rec.action).toBe("NO_HEDGE");
    expect(rec.daysToDue).toBeLessThan(0);
  });

  test("tiny exposure => NO_HEDGE", () => {
    const req: HedgeRequest = {
      bill: { billId: "coffee", amount: 5, currency: "USDC", dueDate: "2026-07-01" },
      asOf: "2026-06-18",
    };
    const rec = advise(req);
    expect(rec.action).toBe("NO_HEDGE");
  });

  test("near-term but expensive premium / low vol => MONITOR not lock", () => {
    const req: HedgeRequest = {
      bill: { billId: "rent", amount: 1_000, currency: "USDC", dueDate: "2026-06-25" },
      asOf: "2026-06-18",
      impliedVol: 0.05, // very low vol
      predictPremiumPct: 0.05, // expensive premium
    };
    const rec = advise(req);
    expect(rec.action).toBe("MONITOR");
  });

  test("urgency rises as due date nears for a worthwhile hedge", () => {
    const base = {
      bill: { billId: "b", amount: 40_000, currency: "USDC" as const },
      impliedVol: 0.5,
      predictPremiumPct: 0.01,
    };
    const soon = advise({ ...base, bill: { ...base.bill, dueDate: "2026-06-25" }, asOf: "2026-06-18" });
    const later = advise({ ...base, bill: { ...base.bill, dueDate: "2026-07-15" }, asOf: "2026-06-18" });
    expect(soon.urgency).toBeGreaterThan(later.urgency);
  });
});
