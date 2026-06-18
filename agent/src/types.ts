/**
 * FlowPay agent — shared domain models.
 *
 * These types describe the off-chain view of on-chain state. The agent service
 * never holds custody; it only *recommends* routes and *monitors* risk. All
 * monetary values are USD unless a field name says otherwise.
 */

/** Symbols for assets FlowPay supports in a user's basket. */
export type AssetSymbol = "SUI" | "USDC" | "BTC" | "ETH" | "DEEP";

/**
 * A single holding in a user's multi-asset basket.
 *
 * `balance` is the on-chain coin amount in whole units (e.g. 1.5 BTC).
 * `priceUsd` is the current oracle (Pyth) price per whole unit.
 * `scallopApyPct` is the annualized supply APY the idle balance currently earns
 *   on Scallop (e.g. 4.2 means 4.2%). Selling this asset forfeits that yield.
 */
export interface AssetHolding {
  symbol: AssetSymbol;
  balance: number;
  priceUsd: number;
  /** Scallop supply APY in percent (annualized). */
  scallopApyPct: number;
}

/**
 * DeepBook order-book microstructure for a trading pair, used to estimate
 * execution cost when routing a spend.
 *
 * `halfSpreadBps` is half the bid/ask spread in basis points — the cost of
 *   crossing the book once.
 * `depthUsd` is the notional resting liquidity within a reasonable band; it
 *   drives our linear price-impact model.
 * `impactCoeffBps` scales price impact: bps of impact incurred when the trade
 *   size equals `depthUsd`. Higher = thinner book.
 */
export interface DeepBookMarket {
  symbol: AssetSymbol;
  halfSpreadBps: number;
  depthUsd: number;
  impactCoeffBps: number;
}

/** A user's full off-chain financial snapshot fed into the router. */
export interface UserBasket {
  userId: string;
  holdings: AssetHolding[];
}

/** Request to compute the optimal asset/route for a payment. */
export interface RouteRequest {
  basket: UserBasket;
  /** Token the merchant wants to receive. */
  merchantToken: AssetSymbol;
  /** Payment size denominated in USD. */
  amountUsd: number;
  /** Flat gas cost estimate for the settlement PTB, in USD. */
  gasUsd?: number;
  /**
   * Horizon (in days) over which to value forfeited Scallop yield as an
   * opportunity cost. Short horizons make yield nearly irrelevant; long
   * horizons make the router prefer selling low-APY assets.
   */
  opportunityHorizonDays?: number;
}

/** Per-asset cost breakdown the router produces while comparing candidates. */
export interface RouteCandidate {
  /** Asset we would sell to fund the payment. */
  sellAsset: AssetSymbol;
  /** Whole-unit amount of `sellAsset` consumed (incl. costs). */
  amountIn: number;
  /** USD cost from crossing the DeepBook spread. */
  spreadCostUsd: number;
  /** USD cost from price impact (linear model). */
  impactCostUsd: number;
  /** USD opportunity cost of forfeited Scallop yield over the horizon. */
  yieldCostUsd: number;
  /** Flat gas cost in USD. */
  gasCostUsd: number;
  /** Sum of all costs above — the figure the router minimizes. */
  totalCostUsd: number;
  /** True when the holding cannot cover the payment + costs. */
  feasible: boolean;
}

/** Result of a routing decision. */
export interface RouteResult {
  /** The chosen (cheapest feasible) candidate, or null if none feasible. */
  best: RouteCandidate | null;
  /** All candidates, cheapest first, for transparency / UI display. */
  candidates: RouteCandidate[];
  /** Human-readable explanation of the choice. */
  rationale: string;
}

/**
 * A Scallop borrow position (obligation) the risk monitor watches.
 *
 * `collateralUsd` and `debtUsd` are oracle-priced. `liquidationThreshold` is
 * the LTV at which the position can be liquidated (e.g. 0.8 = 80%).
 */
export interface Obligation {
  obligationId: string;
  collateralUsd: number;
  debtUsd: number;
  /** LTV (debt/collateral) at which liquidation triggers, 0..1. */
  liquidationThreshold: number;
}

/** A price feed snapshot used for staleness detection. */
export interface OracleFeed {
  symbol: AssetSymbol;
  priceUsd: number;
  /** Unix epoch millis when the feed last published. */
  publishedAtMs: number;
}

/** Inputs to a single risk evaluation pass. */
export interface RiskRequest {
  obligations: Obligation[];
  feeds: OracleFeed[];
  /** Reference "now" in epoch millis (defaults to Date.now() in the service). */
  nowMs: number;
  /** Max feed age before it is considered stale, in seconds. */
  maxFeedAgeSec?: number;
  /** LTV at which we warn before liquidation, e.g. 0.7. */
  warnLtv?: number;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface RiskAlert {
  severity: AlertSeverity;
  code:
    | "LTV_WARNING"
    | "LTV_LIQUIDATION_RISK"
    | "ORACLE_STALE"
    | "PROTOCOL_PAUSE_RECOMMENDED";
  message: string;
  /** Subject of the alert (obligationId or feed symbol). */
  subject: string;
}

export interface RiskReport {
  alerts: RiskAlert[];
  /** True when any condition warrants halting protocol flows. */
  shouldPause: boolean;
  /** Per-obligation computed health for UI surfacing. */
  health: ObligationHealth[];
}

export interface ObligationHealth {
  obligationId: string;
  ltv: number;
  /** collateral*threshold / debt; <1 means underwater. */
  healthFactor: number;
}

/** A bill the user expects to pay in the future. */
export interface UpcomingBill {
  billId: string;
  /** Amount owed, in `currency`. */
  amount: number;
  /** Currency/asset the bill is denominated in. */
  currency: AssetSymbol;
  /** ISO date the bill is due. */
  dueDate: string;
}

export interface HedgeRequest {
  bill: UpcomingBill;
  /** Reference "now" as ISO date (defaults to today in the service). */
  asOf: string;
  /**
   * Annualized implied volatility of the funding asset vs. the bill currency,
   * as a fraction (0.4 = 40%). Drives the hedge recommendation strength.
   */
  impliedVol?: number;
  /** Current Predict binary-option premium as a fraction of notional. */
  predictPremiumPct?: number;
}

export type HedgeAction = "LOCK_RATE" | "MONITOR" | "NO_HEDGE";

export interface HedgeRecommendation {
  action: HedgeAction;
  /** Days until the bill is due. */
  daysToDue: number;
  /** Notional USD-equivalent exposure considered. */
  exposureUsd: number;
  /** Estimated cost of the recommended hedge, in USD (0 when none). */
  estimatedHedgeCostUsd: number;
  /** Score 0..1 expressing how strongly we recommend hedging. */
  urgency: number;
  rationale: string;
}
