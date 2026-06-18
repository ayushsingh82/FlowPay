/// FlowPay — MarginBridge (DeepBook Margin — "Spend Tomorrow" BNPL)
///
/// Opens a small, conservative margin position to give the user spending
/// liquidity *without selling their bag*, then auto-repays from the next
/// incoming payment. LTV is enforced through BorrowGuard + the oracle, so a
/// position can't be opened against a stale price or beyond the collateral
/// factor — the OpenZeppelin safety surface for leverage.
///
/// INTEGRATION: DeepBook (Margin) — replace `open_position` / `repay` with:
///     open:  `deepbook_margin::account::borrow(margin_account, pool, amount, ctx)`
///     repay: `deepbook_margin::account::repay(margin_account, coin, ctx)`
///   The collateral here is the user's FlowVault sCoin value; in production the
///   `MarginAccount` references the DeepBook pool + manager.
module flowpay::margin_bridge {
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::event;

    use flowpay::access_control::{Self, Pause};
    use flowpay::borrow_guard::{Self, RiskParams};
    use flowpay::oracle::{Self, OracleRegistry};
    use flowpay::lending::{Self, LendingMarket};

    // ===== Errors =====
    const ENotOwner: u64 = 1;
    const EOverRepay: u64 = 2;

    /// A user's open BNPL margin position. Tracks the debt owed (in `Debt`
    /// asset units) against `Collateral` posted in their vault.
    public struct MarginPosition<phantom Collateral, phantom Debt> has key, store {
        id: UID,
        owner: address,
        /// outstanding debt in `Debt` units (what must be repaid)
        debt: u64,
        /// USD/e6 value of collateral backing this position at open time
        collateral_usd_e6: u64,
    }

    // ===== Events =====
    public struct MarginOpened has copy, drop {
        position: ID,
        owner: address,
        debt: u64,
        collateral_usd_e6: u64,
    }
    public struct MarginRepaid has copy, drop {
        position: ID,
        owner: address,
        repaid: u64,
        remaining: u64,
    }

    /// Open a "Spend Tomorrow" position: borrow `amount` of `Debt` against
    /// `collateral_usd_e6` worth of vault collateral, returning the spend coin.
    /// Enforces LTV + oracle freshness before drawing liquidity.
    ///
    /// INTEGRATION: DeepBook Margin `account::borrow`.
    public fun open_position<Collateral, Debt>(
        pause: &Pause,
        params: &RiskParams,
        oracle_reg: &OracleRegistry,
        market: &mut LendingMarket,
        collateral_usd_e6: u64,
        amount: u64,
        debt_decimals: u8,
        clock: &Clock,
        ctx: &mut TxContext,
    ): (MarginPosition<Collateral, Debt>, Coin<Debt>) {
        access_control::assert_not_paused(pause);
        // OZ safety: price must be fresh for both legs.
        borrow_guard::require_fresh_oracle<Collateral>(oracle_reg, clock);
        borrow_guard::require_fresh_oracle<Debt>(oracle_reg, clock);

        // Convert the requested borrow into USD to LTV-check it.
        let borrow_usd_e6 = oracle::amount_to_usd_e6<Debt>(oracle_reg, amount, debt_decimals, clock);
        borrow_guard::check_borrow_ltv<Collateral>(params, collateral_usd_e6, borrow_usd_e6);

        // Draw the liquidity (modelled via lending pool; DeepBook margin in prod).
        let funds = lending::borrow<Debt>(market, amount, ctx);

        let pos = MarginPosition<Collateral, Debt> {
            id: object::new(ctx),
            owner: ctx.sender(),
            debt: amount,
            collateral_usd_e6,
        };
        event::emit(MarginOpened {
            position: object::id(&pos),
            owner: pos.owner,
            debt: amount,
            collateral_usd_e6,
        });
        (pos, funds)
    }

    /// Repay (partially or fully) from an incoming payment. Closes + deletes the
    /// position when debt hits zero, returning any over-payment to the caller.
    /// INTEGRATION: DeepBook Margin `account::repay`.
    public fun repay<Collateral, Debt>(
        pause: &Pause,
        market: &mut LendingMarket,
        pos: &mut MarginPosition<Collateral, Debt>,
        mut payment: Coin<Debt>,
        ctx: &mut TxContext,
    ): Coin<Debt> {
        access_control::assert_not_paused(pause);
        assert!(pos.owner == ctx.sender(), ENotOwner);
        let pay_amt = coin::value(&payment);

        let applied = if (pay_amt >= pos.debt) { pos.debt } else { pay_amt };
        let repay_coin = coin::split(&mut payment, applied, ctx);
        lending::repay<Debt>(market, repay_coin);
        pos.debt = pos.debt - applied;

        event::emit(MarginRepaid {
            position: object::id(pos),
            owner: pos.owner,
            repaid: applied,
            remaining: pos.debt,
        });
        // return change (the un-applied remainder of the payment)
        payment
    }

    /// Destroy a fully-repaid position.
    public fun close<Collateral, Debt>(pos: MarginPosition<Collateral, Debt>) {
        let MarginPosition { id, owner: _, debt, collateral_usd_e6: _ } = pos;
        assert!(debt == 0, EOverRepay);
        object::delete(id);
    }

    // ===== Views =====
    public fun debt<Collateral, Debt>(p: &MarginPosition<Collateral, Debt>): u64 { p.debt }
    public fun owner<Collateral, Debt>(p: &MarginPosition<Collateral, Debt>): address { p.owner }
}
