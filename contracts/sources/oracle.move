/// FlowPay — Oracle module
///
/// Local abstraction over a price oracle. In production this is backed by
/// **Pyth Network** price feeds on Sui. We model a `Price` struct + a freshness
/// check so the rest of the package can compile and be tested standalone.
///
/// INTEGRATION: Pyth — replace `PriceFeed` reads with
///   `pyth::pyth::get_price(price_info_object, clock)` and convert the returned
///   `pyth::price::Price` (price, conf, expo, publish_time) into this `Price`.
///   The staleness guard below mirrors Pyth's `PriceFeed::is_fresh` / max-age
///   pattern recommended by Pyth + OpenZeppelin oracle-safety guidance.
module flowpay::oracle {
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use sui::event;
    use std::type_name::{Self, TypeName};

    use flowpay::access_control::AdminCap;

    // ===== Errors =====
    const EPriceStale: u64 = 1;
    const EPriceMissing: u64 = 2;
    const EZeroPrice: u64 = 3;

    /// Default maximum age (ms) before a price is considered stale (~60s).
    const DEFAULT_MAX_AGE_MS: u64 = 60_000;

    /// A single asset price quote, denominated in USD with fixed-point `expo`
    /// (i.e. usd_value = price * 10^expo). For the hackathon we keep prices as
    /// integers scaled to 1e6 (USD micro-dollars) for simplicity.
    public struct Price has store, copy, drop {
        /// USD price scaled by 1e6 (e.g. $1.00 == 1_000_000).
        usd_e6: u64,
        /// Confidence interval, scaled by 1e6 (from Pyth `conf`).
        conf_e6: u64,
        /// Publish timestamp in ms (from Pyth `publish_time` * 1000).
        publish_ms: u64,
    }

    /// Shared registry holding the latest price per asset `TypeName`.
    /// In production each asset maps to a Pyth `PriceInfoObject` id instead.
    public struct OracleRegistry has key {
        id: UID,
        /// asset type -> latest Price
        prices: Table<TypeName, Price>,
        /// Max staleness tolerated, in ms. Tunable by admin.
        max_age_ms: u64,
    }

    // ===== Events =====
    public struct PricePushed has copy, drop {
        asset: TypeName,
        usd_e6: u64,
        publish_ms: u64,
    }

    /// Create + share the oracle registry. Called once at deploy.
    fun init(ctx: &mut TxContext) {
        transfer::share_object(OracleRegistry {
            id: object::new(ctx),
            prices: table::new<TypeName, Price>(ctx),
            max_age_ms: DEFAULT_MAX_AGE_MS,
        });
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }

    /// Push (or update) a price for asset `T`. Admin-gated; in production this
    /// path is replaced by anyone calling Pyth's permissionless update, then
    /// reading the verified `PriceInfoObject`.
    ///
    /// INTEGRATION: Pyth — drop this admin push; instead read the on-chain
    /// `PriceInfoObject` updated by `pyth::pyth::update_price_feeds`.
    public fun push_price<T>(
        _admin: &AdminCap,
        registry: &mut OracleRegistry,
        usd_e6: u64,
        conf_e6: u64,
        clock: &Clock,
    ) {
        assert!(usd_e6 > 0, EZeroPrice);
        let asset = type_name::get<T>();
        let now = clock::timestamp_ms(clock);
        let price = Price { usd_e6, conf_e6, publish_ms: now };
        if (table::contains(&registry.prices, asset)) {
            *table::borrow_mut(&mut registry.prices, asset) = price;
        } else {
            table::add(&mut registry.prices, asset, price);
        };
        event::emit(PricePushed { asset, usd_e6, publish_ms: now });
    }

    /// Admin tune of the staleness window.
    public fun set_max_age(_admin: &AdminCap, registry: &mut OracleRegistry, max_age_ms: u64) {
        registry.max_age_ms = max_age_ms;
    }

    /// Read a *fresh* price for asset `T`, aborting if missing or stale.
    /// This is the OZ-style oracle-safety guard: every consumer must go through
    /// here so staleness is enforced uniformly.
    public fun get_fresh_price<T>(registry: &OracleRegistry, clock: &Clock): Price {
        let asset = type_name::get<T>();
        assert!(table::contains(&registry.prices, asset), EPriceMissing);
        let price = *table::borrow(&registry.prices, asset);
        let now = clock::timestamp_ms(clock);
        // now >= publish_ms always holds for honest clocks; guard against age.
        assert!(now <= price.publish_ms + registry.max_age_ms, EPriceStale);
        price
    }

    /// Returns true if a fresh price exists for `T` (no abort). Used by guards
    /// that want to branch rather than abort.
    public fun is_fresh<T>(registry: &OracleRegistry, clock: &Clock): bool {
        let asset = type_name::get<T>();
        if (!table::contains(&registry.prices, asset)) return false;
        let price = table::borrow(&registry.prices, asset);
        let now = clock::timestamp_ms(clock);
        now <= price.publish_ms + registry.max_age_ms
    }

    /// Convert a raw token amount of asset `T` into USD micro-dollars (1e6),
    /// using a fresh price. `decimals` is the token's decimal count so we can
    /// normalise the amount to whole units.
    public fun amount_to_usd_e6<T>(
        registry: &OracleRegistry,
        amount: u64,
        decimals: u8,
        clock: &Clock,
    ): u64 {
        let price = get_fresh_price<T>(registry, clock);
        // usd_e6 = amount * price.usd_e6 / 10^decimals
        let scale = pow10(decimals);
        // use u128 to avoid overflow on large baskets
        (((amount as u128) * (price.usd_e6 as u128)) / (scale as u128)) as u64
    }

    /// Inverse: how many raw units of `T` are needed to cover `usd_e6` USD.
    public fun usd_e6_to_amount<T>(
        registry: &OracleRegistry,
        usd_e6: u64,
        decimals: u8,
        clock: &Clock,
    ): u64 {
        let price = get_fresh_price<T>(registry, clock);
        assert!(price.usd_e6 > 0, EZeroPrice);
        let scale = pow10(decimals);
        (((usd_e6 as u128) * (scale as u128)) / (price.usd_e6 as u128)) as u64
    }

    // ===== Price accessors =====
    public fun usd_e6(p: &Price): u64 { p.usd_e6 }
    public fun conf_e6(p: &Price): u64 { p.conf_e6 }
    public fun publish_ms(p: &Price): u64 { p.publish_ms }

    fun pow10(d: u8): u64 {
        let mut i = 0u8;
        let mut r = 1u64;
        while (i < d) { r = r * 10; i = i + 1; };
        r
    }
}
