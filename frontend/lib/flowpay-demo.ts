// FlowPay — interactive demo mock logic & types.
// Everything here is seeded + simulated. NO real wallet / chain calls.
// Sui Overflow 2026 demo surface.

export type AssetSymbol = "SUI" | "USDC" | "BTC" | "ETH";

export interface Asset {
  symbol: AssetSymbol;
  name: string;
  /** USD spot price (seeded, drifts slightly while the demo runs) */
  price: number;
  /** units held in the basket */
  amount: number;
  /** live Scallop supply APY for this asset's pool */
  apy: number;
  /**
   * DeepBook half-spread for this market as a fraction of notional.
   * Deeper / more liquid markets (USDC, SUI) have tighter spreads.
   */
  spread: number;
  /**
   * Price-impact coefficient — how much a $1 sell moves the book.
   * Smaller = deeper book. Used by the optimizer for slippage.
   */
  depth: number;
  /** per-asset LTV cap enforced by the OZ-pattern BorrowGuard */
  ltvCap: number;
  /** accent color for charts / dots */
  color: string;
}

export const SEED_ASSETS: Asset[] = [
  {
    symbol: "USDC",
    name: "USD Coin",
    price: 1.0,
    amount: 420.5,
    apy: 0.0612,
    spread: 0.00018,
    depth: 0.0000004,
    ltvCap: 0.9,
    color: "#2775CA",
  },
  {
    symbol: "SUI",
    name: "Sui",
    price: 3.18,
    amount: 96.4,
    apy: 0.0488,
    spread: 0.00042,
    depth: 0.0000011,
    ltvCap: 0.7,
    color: "#4DA2FF",
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 64850,
    amount: 0.00412,
    apy: 0.0125,
    spread: 0.00031,
    depth: 0.0000009,
    ltvCap: 0.75,
    color: "#F7931A",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3420,
    amount: 0.071,
    apy: 0.0241,
    spread: 0.00037,
    depth: 0.000001,
    ltvCap: 0.75,
    color: "#627EEA",
  },
];

export function assetUsdValue(a: Asset): number {
  return a.amount * a.price;
}

export function totalUsdValue(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + assetUsdValue(a), 0);
}

/** Blended portfolio APY weighted by USD value. */
export function blendedApy(assets: Asset[]): number {
  const total = totalUsdValue(assets);
  if (total === 0) return 0;
  return assets.reduce((sum, a) => sum + a.apy * (assetUsdValue(a) / total), 0);
}

// ---------------------------------------------------------------------------
// SmartSpend optimizer — picks the cheapest asset to sell for a given spend.
// Real (small) function so the demo number is genuine, not hardcoded.
// ---------------------------------------------------------------------------

export interface SpendQuote {
  asset: Asset;
  /** units of the asset sold to cover the spend */
  unitsSold: number;
  /** notional in USD being routed */
  notionalUsd: number;
  /** DeepBook spread cost in USD */
  spreadCost: number;
  /** estimated price-impact / slippage cost in USD */
  impactCost: number;
  /** yield given up by withdrawing this asset from Scallop (annual, per day) */
  yieldCost: number;
  /** total all-in cost of using this asset, in USD */
  totalCost: number;
  /** effective bps cost vs notional */
  bps: number;
  feasible: boolean;
}

export interface OptimizerResult {
  best: SpendQuote;
  /** the asset a naive wallet would dump first (highest balance) */
  naive: SpendQuote;
  /** savings of best over naive, in USD */
  savings: number;
  all: SpendQuote[];
}

/**
 * Cost of selling `notionalUsd` worth of `asset` on DeepBook + lost Scallop yield.
 *   spread cost  = notional * spread
 *   impact cost  = notional^2 * depth     (quadratic — bigger sells hurt more)
 *   yield cost   = notional * apy / 365    (one day of foregone yield, a tie-breaker)
 */
export function quoteAsset(asset: Asset, notionalUsd: number): SpendQuote {
  const value = assetUsdValue(asset);
  const feasible = value >= notionalUsd;

  const spreadCost = notionalUsd * asset.spread;
  const impactCost = notionalUsd * notionalUsd * asset.depth;
  const yieldCost = (notionalUsd * asset.apy) / 365;
  const totalCost = spreadCost + impactCost + yieldCost;
  const unitsSold = notionalUsd / asset.price;

  return {
    asset,
    unitsSold,
    notionalUsd,
    spreadCost,
    impactCost,
    yieldCost,
    totalCost,
    bps: (totalCost / notionalUsd) * 10000,
    feasible,
  };
}

/**
 * Run the optimizer: quote every holding that can cover the spend, pick the
 * cheapest all-in. Compare against the "naive" choice (just sell your biggest
 * bag) to surface the savings the way the demo script describes.
 */
export function optimizeSpend(assets: Asset[], notionalUsd: number): OptimizerResult {
  const all = assets
    .map((a) => quoteAsset(a, notionalUsd))
    .sort((x, y) => x.totalCost - y.totalCost);

  const feasible = all.filter((q) => q.feasible);
  const best = (feasible[0] ?? all[0]);

  // naive wallet: dump the largest USD holding regardless of execution cost
  const biggest = [...assets].sort((a, b) => assetUsdValue(b) - assetUsdValue(a))[0];
  const naive = quoteAsset(biggest, notionalUsd);

  return {
    best,
    naive,
    savings: Math.max(0, naive.totalCost - best.totalCost),
    all,
  };
}

// ---------------------------------------------------------------------------
// Atomic PTB steps shown executing during a spend.
// ---------------------------------------------------------------------------

export interface PtbStep {
  id: string;
  label: string;
  detail: string;
  module: string;
}

export function buildPtbSteps(quote: SpendQuote, merchantToken: string, deepEarned: number): PtbStep[] {
  return [
    {
      id: "withdraw",
      label: "Withdraw from Scallop",
      detail: `${quote.unitsSold.toPrecision(4)} ${quote.asset.symbol} unstaked from sCoin position`,
      module: "FlowVault",
    },
    {
      id: "route",
      label: "Route via DeepBook",
      detail: `${quote.asset.symbol} → ${merchantToken} spot, min-out enforced`,
      module: "SmartRouter",
    },
    {
      id: "guard",
      label: "BorrowGuard check",
      detail: `LTV ≤ ${(quote.asset.ltvCap * 100).toFixed(0)}% · Pyth oracle fresh`,
      module: "BorrowGuard",
    },
    {
      id: "transfer",
      label: "Settle to merchant",
      detail: `$${quote.notionalUsd.toFixed(2)} ${merchantToken} transferred`,
      module: "SmartRouter",
    },
    {
      id: "cashback",
      label: "Mint DEEP cashback",
      detail: `+${deepEarned.toFixed(3)} DEEP rewarded to wallet`,
      module: "CashbackMint",
    },
    {
      id: "emit",
      label: "Emit SpendEvent",
      detail: `asset_sold=${quote.asset.symbol} merchant ✓ deep_earned ✓`,
      module: "event",
    },
  ];
}

// ---------------------------------------------------------------------------
// Bills / Lock Rate (DeepBook Predict)
// ---------------------------------------------------------------------------

export interface Bill {
  id: string;
  label: string;
  /** local-currency amount due */
  localAmount: number;
  localCcy: string;
  /** current market FX rate (local per USD) */
  rate: number;
  dueInDays: number;
  /** implied USD cost at today's rate */
  usdToday: number;
  /** DeepBook Predict binary that locks this rate */
  predictMarket: string;
  locked: boolean;
}

export const SEED_BILLS: Bill[] = [
  {
    id: "rent",
    label: "Apartment rent",
    localAmount: 40000,
    localCcy: "INR",
    rate: 83.4,
    dueInDays: 12,
    usdToday: 40000 / 83.4,
    predictMarket: "USD/INR > 84.5 by Jun 30",
    locked: false,
  },
  {
    id: "tuition",
    label: "Tuition installment",
    localAmount: 1850,
    localCcy: "EUR",
    rate: 0.925,
    dueInDays: 24,
    usdToday: 1850 / 0.925,
    predictMarket: "EUR/USD < 1.06 by Jul 12",
    locked: false,
  },
];

// ---------------------------------------------------------------------------
// Spend Tomorrow (DeepBook Margin)
// ---------------------------------------------------------------------------

export interface MarginPlan {
  liquidityUsd: number;
  /** collateral asset kept (not sold) */
  collateral: AssetSymbol;
  /** size of the short opened on DeepBook margin */
  shortSize: number;
  /** weekly margin fee in USD */
  weeklyFee: number;
  ltvUsed: number;
}

export function planMargin(assets: Asset[], liquidityUsd: number, collateral: AssetSymbol): MarginPlan {
  const asset = assets.find((a) => a.symbol === collateral) ?? assets[0];
  const collateralValue = assetUsdValue(asset);
  const ltvUsed = collateralValue > 0 ? liquidityUsd / collateralValue : 0;
  return {
    liquidityUsd,
    collateral,
    shortSize: liquidityUsd / asset.price,
    weeklyFee: liquidityUsd * 0.0009, // ~0.09%/wk funding
    ltvUsed,
  };
}

// ---------------------------------------------------------------------------
// DEEP cashback
// ---------------------------------------------------------------------------

/** DEEP earned per spend = 1.5% of notional, priced in DEEP. */
export const DEEP_PRICE = 0.034;
export const CASHBACK_RATE = 0.015;

export function deepEarnedForSpend(notionalUsd: number): number {
  return (notionalUsd * CASHBACK_RATE) / DEEP_PRICE;
}

/** Staking DEEP buys a fee discount, capped at 30%. */
export function feeDiscountForStake(stakedDeep: number): number {
  // 1000 DEEP staked ≈ 30% discount, linear, capped.
  return Math.min(0.3, (stakedDeep / 1000) * 0.3);
}

// ---------------------------------------------------------------------------
// Safety strip (OZ patterns / Pyth)
// ---------------------------------------------------------------------------

export interface SafetyState {
  paused: boolean;
  oracleAgeSec: number;
  oracleMaxAgeSec: number;
}

export function fmtUsd(n: number, max = 2): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: max });
}

export function fmtNum(n: number, digits = 4): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export const MERCHANT_TOKENS = ["USDC", "SUI", "VND", "USDT"] as const;
export type MerchantToken = (typeof MERCHANT_TOKENS)[number];
