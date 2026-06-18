/// FlowPay — CashbackMint (DEEP-style reward minting)
///
/// Mints a FlowPay loyalty token (FLOW) on every spend, proportional to the USD
/// value transacted — the consumer-facing analogue of DeepBook's DEEP loyalty
/// hooks. Users can later stake FLOW for fee discounts (staking lives in the
/// frontend/agent; on-chain we expose mint + a simple stake view).
///
/// INTEGRATION: DeepBook (DEEP token) — in production, cashback is denominated
///   in / boosted by DEEP earned through DeepBook's loyalty program. The
///   `TreasuryCap<CASHBACK_MINT>` here is the standard Sui `Coin` mint pattern.
module flowpay::cashback_mint {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::event;

    use flowpay::access_control::AdminCap;

    // ===== Errors =====
    const EBadRate: u64 = 1;

    /// Reward rate: FLOW (micro-units) minted per USD/e6 spent. Default: 1 FLOW
    /// (1e6 units, 6 decimals) per $1 (1e6 usd_e6) spent == 1:1 in micro-units.
    const DEFAULT_RATE_BPS: u64 = 10_000; // 100% of usd_e6 minted as FLOW e6

    /// One-time witness for the FLOW coin type.
    public struct CASHBACK_MINT has drop {}

    /// Holds the treasury cap + the current reward rate. Shared so any spend
    /// PTB can mint through it (mint authority stays with this object).
    public struct CashbackTreasury has key {
        id: UID,
        cap: TreasuryCap<CASHBACK_MINT>,
        /// reward rate in bps of usd_e6 spent
        rate_bps: u64,
    }

    // ===== Events =====
    public struct CashbackMinted has copy, drop {
        user: address,
        usd_e6_spent: u64,
        flow_minted: u64,
    }

    /// Standard Sui currency init via one-time witness.
    fun init(witness: CASHBACK_MINT, ctx: &mut TxContext) {
        let (cap, metadata) = coin::create_currency(
            witness,
            6,            // decimals
            b"FLOW",
            b"FlowPay Rewards",
            b"DEEP-style cashback earned on every FlowPay spend",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        transfer::share_object(CashbackTreasury {
            id: object::new(ctx),
            cap,
            rate_bps: DEFAULT_RATE_BPS,
        });
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(CASHBACK_MINT {}, ctx)
    }

    /// Admin tune of the cashback rate.
    public fun set_rate(_admin: &AdminCap, treasury: &mut CashbackTreasury, rate_bps: u64) {
        assert!(rate_bps <= 100_000, EBadRate); // cap at 10x to avoid runaway
        treasury.rate_bps = rate_bps;
    }

    /// Mint cashback for a spend of `usd_e6_spent` and send it to `user`.
    /// Called inside the atomic spend PTB by SmartRouter.
    public(package) fun reward(
        treasury: &mut CashbackTreasury,
        user: address,
        usd_e6_spent: u64,
        ctx: &mut TxContext,
    ) {
        let amount = ((usd_e6_spent as u128) * (treasury.rate_bps as u128) / 10_000) as u64;
        if (amount == 0) return;
        let reward_coin = coin::mint(&mut treasury.cap, amount, ctx);
        event::emit(CashbackMinted { user, usd_e6_spent, flow_minted: amount });
        transfer::public_transfer(reward_coin, user);
    }

    /// Public, non-PTB convenience for demos/tests: same as `reward` but mints
    /// directly. Admin-gated to prevent abuse outside the spend flow.
    public fun reward_admin(
        _admin: &AdminCap,
        treasury: &mut CashbackTreasury,
        user: address,
        usd_e6_spent: u64,
        ctx: &mut TxContext,
    ) {
        reward(treasury, user, usd_e6_spent, ctx)
    }

    public fun rate_bps(treasury: &CashbackTreasury): u64 { treasury.rate_bps }

    public fun total_supply(treasury: &CashbackTreasury): u64 {
        coin::total_supply(&treasury.cap)
    }

    #[test_only]
    public fun burn_for_testing(treasury: &mut CashbackTreasury, c: Coin<CASHBACK_MINT>) {
        coin::burn(&mut treasury.cap, c);
    }
}
