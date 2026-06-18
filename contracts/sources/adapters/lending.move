/// FlowPay — Lending adapter (Scallop abstraction)
///
/// Models Scallop's deposit/withdraw + sCoin accounting and borrow-against-
/// collateral behind a clean local interface so the FlowVault and SmartRouter
/// compile and are testable without the Scallop mainnet package.
///
/// INTEGRATION: Scallop — replace the internal `Pool<T>` book-keeping with real
///   Scallop calls:
///     deposit:  `scallop::lend::deposit(market, coin, ctx)  -> MarketCoin<T>` (sCoin)
///     withdraw: `scallop::lend::withdraw(market, sCoin, ctx) -> Coin<T>`
///     borrow:   `scallop::borrow::borrow(obligation, market, amount, ctx)`
///   The `SCoin<T>` here maps to Scallop's `MarketCoin<T>` (the yield-bearing
///   accounting token). APY accrual is simulated via `index`.
module flowpay::lending {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::table::{Self, Table};
    use std::type_name::{Self, TypeName};

    // ===== Errors =====
    const EInsufficientLiquidity: u64 = 1;
    const EPoolMissing: u64 = 2;

    /// Index scale (1e9) — like Scallop's exchange-rate index between sCoin and
    /// the underlying. index grows as interest accrues.
    const INDEX_SCALE: u128 = 1_000_000_000;

    /// A per-asset lending pool. Holds the underlying liquidity + tracks the
    /// sCoin<->underlying exchange index.
    public struct Pool<phantom T> has store {
        underlying: Balance<T>,
        /// total sCoin minted against this pool
        total_scoin: u64,
        /// exchange index scaled by 1e9; underlying = scoin * index / 1e9
        index: u128,
    }

    /// Yield-bearing accounting token returned on deposit. Maps to Scallop's
    /// `MarketCoin<T>`. `amount` is the sCoin amount (not the underlying).
    public struct SCoin<phantom T> has store {
        amount: u64,
    }

    /// Registry of all pools, keyed by underlying asset type.
    public struct LendingMarket has key {
        id: UID,
        // We store pools in dynamic fields keyed by TypeName via a Table of
        // bag-like handles. For the adapter we keep a presence set + use
        // dynamic object fields would be heavier; instead pools live inline in
        // a Table<TypeName, ...> is not possible (heterogeneous), so the market
        // exposes typed entry points that lazily create pools in dynamic fields.
        pools_present: Table<TypeName, bool>,
    }

    use sui::dynamic_field as df;

    fun init(ctx: &mut TxContext) {
        transfer::share_object(LendingMarket {
            id: object::new(ctx),
            pools_present: table::new<TypeName, bool>(ctx),
        });
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }

    /// Ensure a pool exists for asset `T` (idempotent).
    fun ensure_pool<T>(market: &mut LendingMarket) {
        let key = type_name::get<T>();
        if (!table::contains(&market.pools_present, key)) {
            table::add(&mut market.pools_present, key, true);
            df::add(&mut market.id, key, Pool<T> {
                underlying: balance::zero<T>(),
                total_scoin: 0,
                index: INDEX_SCALE,
            });
        }
    }

    fun pool_mut<T>(market: &mut LendingMarket): &mut Pool<T> {
        let key = type_name::get<T>();
        df::borrow_mut<TypeName, Pool<T>>(&mut market.id, key)
    }

    fun pool_ref<T>(market: &LendingMarket): &Pool<T> {
        let key = type_name::get<T>();
        df::borrow<TypeName, Pool<T>>(&market.id, key)
    }

    /// Deposit underlying, receive sCoin. INTEGRATION: Scallop `lend::deposit`.
    public fun deposit<T>(market: &mut LendingMarket, coin: Coin<T>): SCoin<T> {
        ensure_pool<T>(market);
        let amount = coin::value(&coin);
        let pool = pool_mut<T>(market);
        // scoin minted = underlying * 1e9 / index
        let minted = (((amount as u128) * INDEX_SCALE) / pool.index) as u64;
        balance::join(&mut pool.underlying, coin::into_balance(coin));
        pool.total_scoin = pool.total_scoin + minted;
        SCoin<T> { amount: minted }
    }

    /// Redeem sCoin for underlying. INTEGRATION: Scallop `lend::withdraw`.
    public fun withdraw<T>(market: &mut LendingMarket, scoin: SCoin<T>, ctx: &mut TxContext): Coin<T> {
        let SCoin { amount: scoin_amt } = scoin;
        let pool = pool_mut<T>(market);
        let underlying_amt = (((scoin_amt as u128) * pool.index) / INDEX_SCALE) as u64;
        assert!(balance::value(&pool.underlying) >= underlying_amt, EInsufficientLiquidity);
        pool.total_scoin = pool.total_scoin - scoin_amt;
        coin::from_balance(balance::split(&mut pool.underlying, underlying_amt), ctx)
    }

    /// Borrow underlying against the market (no-exit-yield spend mode). For the
    /// adapter this just splits liquidity; production enforces obligation LTV.
    /// INTEGRATION: Scallop `borrow::borrow(obligation, market, amount)`.
    public fun borrow<T>(market: &mut LendingMarket, amount: u64, ctx: &mut TxContext): Coin<T> {
        assert!(table::contains(&market.pools_present, type_name::get<T>()), EPoolMissing);
        let pool = pool_mut<T>(market);
        assert!(balance::value(&pool.underlying) >= amount, EInsufficientLiquidity);
        coin::from_balance(balance::split(&mut pool.underlying, amount), ctx)
    }

    /// Repay borrowed underlying back into the pool.
    /// INTEGRATION: Scallop `borrow::repay(obligation, market, coin)`.
    public fun repay<T>(market: &mut LendingMarket, coin: Coin<T>) {
        let pool = pool_mut<T>(market);
        balance::join(&mut pool.underlying, coin::into_balance(coin));
    }

    /// Simulate interest accrual by bumping the index (admin/keeper driven in
    /// production by Scallop's interest model). bps = basis points growth.
    public fun accrue<T>(market: &mut LendingMarket, bps: u64) {
        let pool = pool_mut<T>(market);
        pool.index = pool.index + (pool.index * (bps as u128) / 10_000);
    }

    // ===== Views =====

    /// Underlying value currently redeemable for a given sCoin position.
    public fun scoin_to_underlying<T>(market: &LendingMarket, scoin: &SCoin<T>): u64 {
        let pool = pool_ref<T>(market);
        (((scoin.amount as u128) * pool.index) / INDEX_SCALE) as u64
    }

    public fun scoin_amount<T>(scoin: &SCoin<T>): u64 { scoin.amount }

    public fun pool_liquidity<T>(market: &LendingMarket): u64 {
        balance::value(&pool_ref<T>(market).underlying)
    }

    /// Merge two sCoin positions of the same asset.
    public fun join_scoin<T>(a: &mut SCoin<T>, b: SCoin<T>) {
        let SCoin { amount } = b;
        a.amount = a.amount + amount;
    }

    /// Split `amount` sCoin off a position.
    public fun split_scoin<T>(a: &mut SCoin<T>, amount: u64): SCoin<T> {
        assert!(a.amount >= amount, EInsufficientLiquidity);
        a.amount = a.amount - amount;
        SCoin<T> { amount }
    }

    public fun zero_scoin<T>(): SCoin<T> { SCoin<T> { amount: 0 } }

    /// Destroy an empty sCoin handle.
    public fun destroy_zero_scoin<T>(scoin: SCoin<T>) {
        let SCoin { amount } = scoin;
        assert!(amount == 0, EInsufficientLiquidity);
    }
}
