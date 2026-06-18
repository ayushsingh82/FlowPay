/// FlowPay — DEX adapter (DeepBook Spot abstraction)
///
/// Models DeepBook's spot orderbook swap behind a local constant-rate pool so
/// the SmartRouter's atomic spend flow is *real Move* that calls a swap fn.
///
/// INTEGRATION: DeepBook (Spot) — replace `swap_exact_in` with a real DeepBook
///   market order:
///     `deepbook::pool::swap_exact_base_for_quote(pool, base_coin, deep_fee, clock, ctx)`
///   or the quote-for-base variant, using a `BalanceManager` + `TradeProof`.
///   The `min_out` slippage guard here mirrors the `min_quote_out` parameter.
module flowpay::dex {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::table::{Self, Table};
    use sui::dynamic_field as df;
    use std::type_name::{Self, TypeName};

    // ===== Errors =====
    const ESlippage: u64 = 1;
    const EPoolMissing: u64 = 2;
    const EInsufficientLiquidity: u64 = 3;

    /// Fee charged on swaps, in basis points (DeepBook taker fee analogue).
    const SWAP_FEE_BPS: u64 = 10; // 0.10%

    /// A spot pool for the pair (Base, Quote). Holds both sides' liquidity and
    /// a price (quote units per 1e9 base units) to deterministically quote.
    public struct SpotPool<phantom Base, phantom Quote> has store {
        base: Balance<Base>,
        quote: Balance<Quote>,
        /// price: quote micro-units per base micro-unit, scaled by 1e9.
        price_e9: u128,
    }

    public struct DexMarket has key {
        id: UID,
        pairs_present: Table<vector<u8>, bool>,
    }

    fun init(ctx: &mut TxContext) {
        transfer::share_object(DexMarket {
            id: object::new(ctx),
            pairs_present: table::new<vector<u8>, bool>(ctx),
        });
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }

    /// Stable key for a directed pair (Base, Quote).
    fun pair_key<Base, Quote>(): vector<u8> {
        let mut k = type_name::into_string(type_name::get<Base>()).into_bytes();
        std::vector::append(&mut k, b"->");
        std::vector::append(&mut k, type_name::into_string(type_name::get<Quote>()).into_bytes());
        k
    }

    /// Create / seed a pool for (Base, Quote). Test + admin bootstrap path; in
    /// production DeepBook pools already exist on-chain.
    public fun create_pool<Base, Quote>(
        market: &mut DexMarket,
        base_seed: Coin<Base>,
        quote_seed: Coin<Quote>,
        price_e9: u128,
    ) {
        let key = pair_key<Base, Quote>();
        assert!(!table::contains(&market.pairs_present, key), EPoolMissing);
        table::add(&mut market.pairs_present, key, true);
        df::add(&mut market.id, pair_key<Base, Quote>(), SpotPool<Base, Quote> {
            base: coin::into_balance(base_seed),
            quote: coin::into_balance(quote_seed),
            price_e9,
        });
    }

    fun pool_mut<Base, Quote>(market: &mut DexMarket): &mut SpotPool<Base, Quote> {
        df::borrow_mut<vector<u8>, SpotPool<Base, Quote>>(&mut market.id, pair_key<Base, Quote>())
    }

    fun pool_ref<Base, Quote>(market: &DexMarket): &SpotPool<Base, Quote> {
        df::borrow<vector<u8>, SpotPool<Base, Quote>>(&market.id, pair_key<Base, Quote>())
    }

    /// Quote how much `Quote` you'd receive for `amount_in` of `Base`, net fee.
    public fun quote_out<Base, Quote>(market: &DexMarket, amount_in: u64): u64 {
        let pool = pool_ref<Base, Quote>(market);
        gross_out(pool.price_e9, amount_in)
    }

    fun gross_out(price_e9: u128, amount_in: u64): u64 {
        let gross = ((amount_in as u128) * price_e9 / 1_000_000_000) as u64;
        let fee = gross * SWAP_FEE_BPS / 10_000;
        gross - fee
    }

    /// Swap an exact amount of `Base` in for `Quote` out, enforcing `min_out`
    /// slippage protection. This is the core call SmartRouter makes on spend.
    /// INTEGRATION: DeepBook `pool::swap_exact_base_for_quote`.
    public fun swap_exact_in<Base, Quote>(
        market: &mut DexMarket,
        coin_in: Coin<Base>,
        min_out: u64,
        ctx: &mut TxContext,
    ): Coin<Quote> {
        let amount_in = coin::value(&coin_in);
        let pool = pool_mut<Base, Quote>(market);
        let out = gross_out(pool.price_e9, amount_in);
        assert!(out >= min_out, ESlippage);
        assert!(balance::value(&pool.quote) >= out, EInsufficientLiquidity);
        balance::join(&mut pool.base, coin::into_balance(coin_in));
        coin::from_balance(balance::split(&mut pool.quote, out), ctx)
    }

    /// Admin/keeper price update (mirrors orderbook mid-price moving).
    public fun set_price<Base, Quote>(market: &mut DexMarket, price_e9: u128) {
        pool_mut<Base, Quote>(market).price_e9 = price_e9;
    }

    public fun pool_price_e9<Base, Quote>(market: &DexMarket): u128 {
        pool_ref<Base, Quote>(market).price_e9
    }
}
