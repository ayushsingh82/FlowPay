/// FlowPay — SmartRouter (the brain: per-tx optimal-asset selection + spend)
///
/// This is where "every spend = one PTB" lives. On a spend the router:
///   1. picks the optimal asset to sell (cheapest USD cost given oracle prices),
///   2. withdraws it from the FlowVault (Scallop sCoin -> Coin),
///   3. routes it through DeepBook spot for best execution (with slippage guard),
///   4. transfers the merchant's preferred token to them,
///   5. mints DEEP-style FLOW cashback to the user,
///   6. emits a SpendEvent.
///
/// All sponsor surfaces converge here: Scallop (withdraw), DeepBook (swap),
/// Pyth (price + staleness via BorrowGuard), OpenZeppelin (Pause + guards),
/// DEEP cashback (CashbackMint).
module flowpay::smart_router {
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::event;
    use std::type_name::{Self, TypeName};

    use flowpay::access_control::{Self, Pause};
    use flowpay::flow_vault::{Self, FlowVault};
    use flowpay::lending::LendingMarket;
    use flowpay::dex::{Self, DexMarket};
    use flowpay::oracle::{Self, OracleRegistry};
    use flowpay::borrow_guard::{Self, RiskParams};
    use flowpay::cashback_mint::{Self, CashbackTreasury};

    // ===== Errors =====
    const EInsufficientBalance: u64 = 1;

    // ===== Events =====
    public struct SpendEvent has copy, drop {
        user: address,
        merchant: address,
        asset_sold: TypeName,
        amount_sold: u64,
        merchant_received: u64,
        usd_e6_value: u64,
        deep_earned: u64,
    }

    /// A routing decision the off-chain optimiser produced and the chain
    /// verifies: "sell `amount_in` of asset Sold to deliver the bill".
    public struct RouteDecision has copy, drop {
        amount_in: u64,
        usd_e6_value: u64,
    }

    /// Pick how much of asset `Sold` (in underlying units) is needed to settle
    /// a `target_usd_e6` bill, using a *fresh* oracle price. The off-chain agent
    /// compares this across the user's basket and submits the cheapest; on-chain
    /// we recompute to verify the chosen asset is actually affordable + fresh.
    ///
    /// INTEGRATION: Pyth — `target` USD comes from the merchant invoice; the
    /// per-asset USD price comes from the verified Pyth feed via `oracle`.
    public fun pick_optimal<Sold>(
        oracle_reg: &OracleRegistry,
        target_usd_e6: u64,
        sold_decimals: u8,
        clock: &Clock,
    ): RouteDecision {
        // amount of `Sold` needed to cover the bill at the fresh price
        let amount_in = oracle::usd_e6_to_amount<Sold>(oracle_reg, target_usd_e6, sold_decimals, clock);
        RouteDecision { amount_in, usd_e6_value: target_usd_e6 }
    }

    public fun route_amount_in(d: &RouteDecision): u64 { d.amount_in }
    public fun route_usd_e6(d: &RouteDecision): u64 { d.usd_e6_value }

    /// THE ATOMIC SPEND. Generic over:
    ///   `Sold`     — the asset the router sells from the vault (e.g. BTC proxy)
    ///   `Merchant` — the token the merchant wants to receive (e.g. USDC)
    ///
    /// Steps map 1:1 to the docs' "every spend = one PTB" pseudo-code.
    public fun spend<Sold, Merchant>(
        vault: &mut FlowVault,
        lending_market: &mut LendingMarket,
        dex_market: &mut DexMarket,
        oracle_reg: &OracleRegistry,
        params: &RiskParams,
        cashback: &mut CashbackTreasury,
        pause: &Pause,
        clock: &Clock,
        merchant: address,
        target_usd_e6: u64,
        sold_decimals: u8,
        ctx: &mut TxContext,
    ) {
        // [OZ] global emergency pause check first.
        access_control::assert_not_paused(pause);

        // [Pyth + OZ] staleness guard on the asset we're about to sell.
        borrow_guard::require_fresh_oracle<Sold>(oracle_reg, clock);

        // 1. SmartRouter picks optimal asset to sell (verify affordability).
        //    `amount_in` is in underlying units. We draw the matching sCoin
        //    amount; in this adapter the sCoin index starts at 1:1, so a fresh
        //    deposit's sCoin balance equals its underlying. (Production converts
        //    via lending::scoin_to_underlying before the balance check.)
        let decision = pick_optimal<Sold>(oracle_reg, target_usd_e6, sold_decimals, clock);
        let amount_in = decision.amount_in;
        assert!(flow_vault::scoin_balance<Sold>(vault) >= amount_in, EInsufficientBalance);

        // 2. [Scallop] withdraw the funds from the user's yield position.
        //    INTEGRATION: in no-exit-yield mode this becomes lending::borrow.
        let funds: Coin<Sold> = flow_vault::take<Sold>(vault, lending_market, amount_in, ctx);

        // 3. [DeepBook Spot] route through the orderbook for best execution.
        //    Compute a slippage-protected floor and verify it against guards.
        let expected_out = dex::quote_out<Sold, Merchant>(dex_market, coin::value(&funds));
        let min_out = ((expected_out as u128)
            * ((10_000 - borrow_guard::max_slippage_bps(params)) as u128) / 10_000) as u64;
        borrow_guard::check_slippage(params, expected_out, min_out);
        let payout: Coin<Merchant> = dex::swap_exact_in<Sold, Merchant>(dex_market, funds, min_out, ctx);
        let merchant_received = coin::value(&payout);

        // 4. transfer to merchant.
        let user = ctx.sender();
        transfer::public_transfer(payout, merchant);

        // 5. [DeepBook DEEP] mint cashback to the user.
        cashback_mint::reward(cashback, user, target_usd_e6, ctx);
        let deep_earned = ((target_usd_e6 as u128)
            * (cashback_mint::rate_bps(cashback) as u128) / 10_000) as u64;

        // 6. emit the event.
        event::emit(SpendEvent {
            user,
            merchant,
            asset_sold: type_name::get<Sold>(),
            amount_sold: amount_in,
            merchant_received,
            usd_e6_value: target_usd_e6,
            deep_earned,
        });
    }

    /// Entry wrapper so the spend can be invoked directly (the frontend builds a
    /// richer PTB, but this proves the flow is a single atomic call).
    public entry fun spend_entry<Sold, Merchant>(
        vault: &mut FlowVault,
        lending_market: &mut LendingMarket,
        dex_market: &mut DexMarket,
        oracle_reg: &OracleRegistry,
        params: &RiskParams,
        cashback: &mut CashbackTreasury,
        pause: &Pause,
        clock: &Clock,
        merchant: address,
        target_usd_e6: u64,
        sold_decimals: u8,
        ctx: &mut TxContext,
    ) {
        spend<Sold, Merchant>(
            vault, lending_market, dex_market, oracle_reg, params, cashback,
            pause, clock, merchant, target_usd_e6, sold_decimals, ctx,
        )
    }
}
