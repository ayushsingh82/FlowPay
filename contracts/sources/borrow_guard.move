/// FlowPay — BorrowGuard (OpenZeppelin-pattern risk layer)
///
/// Centralised risk checks for any flow that takes on debt or sells collateral:
///   * Per-asset LTV cap (collateral-factor) enforcement.
///   * Oracle staleness guard (delegated to `oracle::get_fresh_price`).
///   * Slippage / min-out sanity.
/// All privileged tuning is gated by `AdminCap`; checks abort loudly so callers
/// can't proceed past a failed guard. This is FlowPay's OZ safety surface.
module flowpay::borrow_guard {
    use sui::clock::Clock;
    use sui::table::{Self, Table};
    use sui::event;
    use std::type_name::{Self, TypeName};

    use flowpay::access_control::AdminCap;
    use flowpay::oracle::{Self, OracleRegistry};

    // ===== Errors =====
    const ELtvExceeded: u64 = 1;
    const ESlippageTooHigh: u64 = 2;
    const EParamMissing: u64 = 3;
    const EBadParam: u64 = 4;

    /// 100% in basis points.
    const BPS_DENOM: u64 = 10_000;
    /// Default collateral factor if an asset isn't configured (50%).
    const DEFAULT_LTV_BPS: u64 = 5_000;
    /// Default max slippage tolerated on a routed spend (1%).
    const DEFAULT_MAX_SLIPPAGE_BPS: u64 = 100;

    /// Shared risk-parameter registry.
    public struct RiskParams has key {
        id: UID,
        /// asset TypeName -> max LTV in bps (collateral factor)
        ltv_bps: Table<TypeName, u64>,
        /// global max slippage tolerated, in bps
        max_slippage_bps: u64,
    }

    // ===== Events =====
    public struct LtvSet has copy, drop { asset: TypeName, ltv_bps: u64 }
    public struct GuardRejected has copy, drop { reason: u64 }

    fun init(ctx: &mut TxContext) {
        transfer::share_object(RiskParams {
            id: object::new(ctx),
            ltv_bps: table::new<TypeName, u64>(ctx),
            max_slippage_bps: DEFAULT_MAX_SLIPPAGE_BPS,
        });
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }

    // ===== Admin tuning =====

    /// Set the collateral factor (max LTV) for an asset. Admin only.
    public fun set_ltv<T>(_admin: &AdminCap, params: &mut RiskParams, ltv_bps: u64) {
        assert!(ltv_bps <= BPS_DENOM, EBadParam);
        let key = type_name::get<T>();
        if (table::contains(&params.ltv_bps, key)) {
            *table::borrow_mut(&mut params.ltv_bps, key) = ltv_bps;
        } else {
            table::add(&mut params.ltv_bps, key, ltv_bps);
        };
        event::emit(LtvSet { asset: key, ltv_bps });
    }

    public fun set_max_slippage(_admin: &AdminCap, params: &mut RiskParams, bps: u64) {
        assert!(bps <= BPS_DENOM, EBadParam);
        params.max_slippage_bps = bps;
    }

    public fun ltv_bps<T>(params: &RiskParams): u64 {
        let key = type_name::get<T>();
        if (table::contains(&params.ltv_bps, key)) *table::borrow(&params.ltv_bps, key)
        else DEFAULT_LTV_BPS
    }

    // ===== Guards =====

    /// Assert a borrow is within LTV given `collateral_usd_e6` backing it.
    /// Uses the asset's configured collateral factor. Aborts on violation.
    public fun check_borrow_ltv<Collateral>(
        params: &RiskParams,
        collateral_usd_e6: u64,
        borrow_usd_e6: u64,
    ) {
        let max_ltv = ltv_bps<Collateral>(params);
        // max borrow = collateral * ltv / 1e4
        let max_borrow = ((collateral_usd_e6 as u128) * (max_ltv as u128) / (BPS_DENOM as u128)) as u64;
        if (borrow_usd_e6 > max_borrow) {
            event::emit(GuardRejected { reason: ELtvExceeded });
            abort ELtvExceeded
        }
    }

    /// Assert the oracle has a *fresh* price for `T` and return its USD/e6 value.
    /// This is the staleness guard — it delegates to `oracle::get_fresh_price`,
    /// which aborts `EPriceStale` if the price is older than the window.
    public fun require_fresh_oracle<T>(
        registry: &OracleRegistry,
        clock: &Clock,
    ) {
        // get_fresh_price aborts on stale/missing; we just trigger the check.
        let _p = oracle::get_fresh_price<T>(registry, clock);
    }

    /// Assert realised output isn't worse than expected beyond max slippage.
    /// `expected_out` is the quoted amount, `actual_min_out` the floor enforced.
    public fun check_slippage(
        params: &RiskParams,
        expected_out: u64,
        actual_min_out: u64,
    ) {
        // floor must be >= expected * (1 - maxSlippage)
        let floor = ((expected_out as u128)
            * ((BPS_DENOM - params.max_slippage_bps) as u128)
            / (BPS_DENOM as u128)) as u64;
        if (actual_min_out < floor) {
            event::emit(GuardRejected { reason: ESlippageTooHigh });
            abort ESlippageTooHigh
        }
    }

    public fun max_slippage_bps(params: &RiskParams): u64 { params.max_slippage_bps }
}
