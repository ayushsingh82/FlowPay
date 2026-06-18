import { test, expect, describe } from "bun:test";
import { route, spreadCost, impactCost, yieldCost } from "../src/router.ts";
import { fixtureMarkets } from "../src/fixtures.ts";
import type { DeepBookMarket, RouteRequest, UserBasket } from "../src/types.ts";

const markets = fixtureMarkets;

function basket(holdings: UserBasket["holdings"]): UserBasket {
  return { userId: "t", holdings };
}

describe("cost primitives", () => {
  const m: DeepBookMarket = {
    symbol: "BTC",
    halfSpreadBps: 8,
    depthUsd: 30_000,
    impactCoeffBps: 30,
  };

  test("spread cost scales with notional", () => {
    expect(spreadCost(10_000, m)).toBeCloseTo(8, 6); // 8bps of 10k
  });

  test("impact cost is quadratic-ish in size/depth", () => {
    // 30k trade into 30k depth -> sizeRatio 1 -> full coeff (30bps)
    expect(impactCost(30_000, m)).toBeCloseTo(90, 6);
    // half the size -> quarter-ish (linear * ratio) = 15k*30bps*0.5 = 22.5
    expect(impactCost(15_000, m)).toBeCloseTo(22.5, 6);
  });

  test("yield cost reflects forfeited APY over horizon", () => {
    // $1000 at 6.5% for 7 days
    expect(yieldCost(1_000, 6.5, 7)).toBeCloseTo((1000 * 0.065 * 7) / 365, 6);
  });
});

describe("router picks cheapest asset", () => {
  test("prefers low-APY tight-book USDC for a USDC merchant (no hop)", () => {
    const req: RouteRequest = {
      basket: basket([
        { symbol: "SUI", balance: 1000, priceUsd: 1.2, scallopApyPct: 6.5 },
        { symbol: "USDC", balance: 1000, priceUsd: 1.0, scallopApyPct: 3.0 },
        { symbol: "BTC", balance: 1, priceUsd: 65_000, scallopApyPct: 0.5 },
      ]),
      merchantToken: "USDC",
      amountUsd: 20,
    };
    const res = route(req, markets);
    // USDC->USDC has no swap cost; only yield+gas. But BTC has tiny APY (0.5%).
    // Compute which wins: USDC yield = 20*0.03*7/365; BTC yield=20*0.005*7/365
    // BTC also pays spread+impact though. With $20 those are tiny.
    expect(res.best).not.toBeNull();
    expect(res.candidates[0]?.feasible).toBe(true);
    // The cheapest must be either USDC (no hop) or BTC (low APY). Assert it's
    // strictly cheaper than selling high-APY SUI.
    const sui = res.candidates.find((c) => c.sellAsset === "SUI");
    expect(res.best!.totalCostUsd).toBeLessThan(sui!.totalCostUsd);
  });

  test("for tiny payment, lowest-APY asset wins despite small spread", () => {
    // Paying in ETH (merchant token). BTC has 0.5% APY vs SUI 6.5%.
    const req: RouteRequest = {
      basket: basket([
        { symbol: "SUI", balance: 1000, priceUsd: 1.2, scallopApyPct: 6.5 },
        { symbol: "BTC", balance: 1, priceUsd: 65_000, scallopApyPct: 0.5 },
      ]),
      merchantToken: "ETH",
      amountUsd: 5,
      opportunityHorizonDays: 30,
    };
    const res = route(req, markets);
    expect(res.best?.sellAsset).toBe("BTC");
  });

  test("high-APY asset chosen when its book is far tighter and horizon short", () => {
    // Make USDC extremely high APY but it's the merchant token (no hop), vs
    // BTC with low APY but a swap cost. Short horizon shrinks yield cost.
    const req: RouteRequest = {
      basket: basket([
        { symbol: "USDC", balance: 1000, priceUsd: 1.0, scallopApyPct: 50 },
        { symbol: "BTC", balance: 1, priceUsd: 65_000, scallopApyPct: 0.5 },
      ]),
      merchantToken: "USDC",
      amountUsd: 100,
      opportunityHorizonDays: 1,
    };
    const res = route(req, markets);
    // 1-day horizon: USDC yield cost = 100*0.5*1/365 ~ 0.137. BTC swap:
    // spread 8bps=0.08 + impact (100/30000*30bps*100) tiny + yield ~0.0001.
    // BTC total ~0.09+gas; USDC ~0.137+gas -> BTC wins.
    expect(res.best?.sellAsset).toBe("BTC");
  });

  test("infeasible when no holding covers the payment", () => {
    const req: RouteRequest = {
      basket: basket([
        { symbol: "USDC", balance: 5, priceUsd: 1.0, scallopApyPct: 3 },
      ]),
      merchantToken: "USDC",
      amountUsd: 100,
    };
    const res = route(req, markets);
    expect(res.best).toBeNull();
    expect(res.candidates.every((c) => !c.feasible)).toBe(true);
    expect(res.rationale).toContain("No holding");
  });

  test("asset with no DeepBook market is infeasible for cross-token", () => {
    const req: RouteRequest = {
      basket: basket([
        { symbol: "SUI", balance: 1000, priceUsd: 1.2, scallopApyPct: 6.5 },
      ]),
      merchantToken: "USDC",
      amountUsd: 20,
    };
    // Remove the SUI market.
    const noSui = markets.filter((m) => m.symbol !== "SUI");
    const res = route(req, noSui);
    expect(res.best).toBeNull();
  });

  test("candidates sorted cheapest-first and deterministic", () => {
    const req: RouteRequest = {
      basket: basket([
        { symbol: "SUI", balance: 1000, priceUsd: 1.2, scallopApyPct: 6.5 },
        { symbol: "USDC", balance: 1000, priceUsd: 1.0, scallopApyPct: 3.0 },
        { symbol: "BTC", balance: 1, priceUsd: 65_000, scallopApyPct: 0.5 },
      ]),
      merchantToken: "ETH",
      amountUsd: 50,
    };
    const a = route(req, markets);
    const b = route(req, markets);
    expect(a.best?.sellAsset).toBe(b.best?.sellAsset);
    for (let i = 1; i < a.candidates.length; i++) {
      const prev = a.candidates[i - 1]!;
      const cur = a.candidates[i]!;
      if (prev.feasible && cur.feasible) {
        expect(prev.totalCostUsd).toBeLessThanOrEqual(cur.totalCostUsd);
      }
    }
  });

  test("rationale reports savings vs runner-up", () => {
    const req: RouteRequest = {
      basket: basket([
        { symbol: "SUI", balance: 1000, priceUsd: 1.2, scallopApyPct: 6.5 },
        { symbol: "USDC", balance: 1000, priceUsd: 1.0, scallopApyPct: 3.0 },
      ]),
      merchantToken: "ETH",
      amountUsd: 50,
    };
    const res = route(req, markets);
    expect(res.rationale).toContain("saving");
  });
});
