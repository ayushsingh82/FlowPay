/**
 * Data-source adapters.
 *
 * The agent core (router/risk/hedge) is pure and takes data as arguments. This
 * module defines the *interface* between that core and the outside world, plus
 * a fixture-backed implementation so the service runs standalone.
 *
 * INTEGRATION: replace `FixtureAdapter` with a real implementation that calls:
 *   - Sui SDK         -> read FlowVault holdings, Scallop obligations
 *   - DeepBook        -> read level-2 book for spread/depth (markets)
 *   - DeepBook Predict-> read binary-option premiums & implied vol
 *   - Pyth            -> read prices & publish timestamps (oracle feeds)
 * Each method below maps 1:1 onto one of those reads.
 */

import type {
  AssetSymbol,
  DeepBookMarket,
  Obligation,
  OracleFeed,
  UserBasket,
} from "./types.ts";
import {
  fixtureBaskets,
  fixtureMarkets,
  fixtureObligations,
  fixtureFeeds,
} from "./fixtures.ts";

export interface MarketDataSource {
  /** Read the user's multi-asset basket (FlowVault + Scallop balances/APYs). */
  getBasket(userId: string): Promise<UserBasket | null>;
  /** Read DeepBook spot microstructure for the given assets. */
  getMarkets(symbols: AssetSymbol[]): Promise<DeepBookMarket[]>;
  /** Read Scallop obligations to monitor. */
  getObligations(userId: string): Promise<Obligation[]>;
  /** Read Pyth oracle feeds for staleness/price. */
  getFeeds(symbols: AssetSymbol[]): Promise<OracleFeed[]>;
}

/** Standalone, deterministic adapter backed by seeded fixtures. */
export class FixtureAdapter implements MarketDataSource {
  async getBasket(userId: string): Promise<UserBasket | null> {
    return fixtureBaskets[userId] ?? null;
  }

  async getMarkets(symbols: AssetSymbol[]): Promise<DeepBookMarket[]> {
    return fixtureMarkets.filter((m) => symbols.includes(m.symbol));
  }

  async getObligations(userId: string): Promise<Obligation[]> {
    return fixtureObligations[userId] ?? [];
  }

  async getFeeds(symbols: AssetSymbol[]): Promise<OracleFeed[]> {
    // Feeds are timestamped relative to "now" at read time so staleness logic
    // exercises against the live clock. See fixtures.ts.
    return fixtureFeeds(Date.now()).filter((f) => symbols.includes(f.symbol));
  }
}
