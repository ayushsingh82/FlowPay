/// FlowPay — HedgeManager (DeepBook Predict — "Lock Rate")
///
/// Lifecycle for FX rate-lock positions backing upcoming bills. A user with
/// "₹40k rent due next month" opens a binary Predict position that pays out if
/// the rate moves against them, effectively locking today's rate.
///
/// INTEGRATION: DeepBook (Predict) — replace `open` / `settle` with real
///   DeepBook Predict market calls:
///     open:   `deepbook_predict::market::buy(market, side, stake, clock, ctx)`
///     settle: `deepbook_predict::market::claim(position, outcome_proof, ctx)`
///   The `target_rate_e6` corresponds to the strike of the binary option.
module flowpay::hedge_manager {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use sui::event;

    use flowpay::access_control::{Self, Pause};

    // ===== Errors =====
    const ENotOwner: u64 = 1;
    const EAlreadySettled: u64 = 2;
    const ENotMatured: u64 = 3;
    const EBadSide: u64 = 4;

    /// Hedge direction (which way the user is protected).
    const SIDE_RATE_UP: u8 = 0;   // protect against the rate rising
    const SIDE_RATE_DOWN: u8 = 1; // protect against the rate falling

    /// An open hedge position. Owned by the user. Holds the staked premium as
    /// collateral until settlement.
    public struct HedgePosition<phantom Stake> has key, store {
        id: UID,
        owner: address,
        /// strike rate (e.g. USD/INR) scaled by 1e6
        target_rate_e6: u64,
        side: u8,
        /// staked premium backing the binary option
        stake: Balance<Stake>,
        /// when the underlying bill is due (ms); settlement allowed after this
        maturity_ms: u64,
        settled: bool,
    }

    // ===== Events =====
    public struct HedgeOpened has copy, drop {
        position: ID,
        owner: address,
        target_rate_e6: u64,
        side: u8,
        stake: u64,
        maturity_ms: u64,
    }
    public struct HedgeSettled has copy, drop {
        position: ID,
        owner: address,
        won: bool,
        payout: u64,
    }

    /// Open a rate-lock hedge. Stakes `premium`, records the strike + maturity.
    /// INTEGRATION: DeepBook Predict `market::buy`.
    public fun open<Stake>(
        pause: &Pause,
        target_rate_e6: u64,
        side: u8,
        premium: Coin<Stake>,
        maturity_ms: u64,
        ctx: &mut TxContext,
    ): HedgePosition<Stake> {
        access_control::assert_not_paused(pause);
        assert!(side == SIDE_RATE_UP || side == SIDE_RATE_DOWN, EBadSide);
        let stake_amt = coin::value(&premium);
        let pos = HedgePosition<Stake> {
            id: object::new(ctx),
            owner: ctx.sender(),
            target_rate_e6,
            side,
            stake: coin::into_balance(premium),
            maturity_ms,
            settled: false,
        };
        event::emit(HedgeOpened {
            position: object::id(&pos),
            owner: pos.owner,
            target_rate_e6,
            side,
            stake: stake_amt,
            maturity_ms,
        });
        pos
    }

    /// Convenience entry that opens + keeps the position with the user.
    public entry fun open_and_keep<Stake>(
        pause: &Pause,
        target_rate_e6: u64,
        side: u8,
        premium: Coin<Stake>,
        maturity_ms: u64,
        ctx: &mut TxContext,
    ) {
        let pos = open<Stake>(pause, target_rate_e6, side, premium, maturity_ms, ctx);
        transfer::public_transfer(pos, ctx.sender());
    }

    /// Settle the position after maturity. `observed_rate_e6` is the realised
    /// FX rate (from oracle / Predict resolution). If the user's protected side
    /// won, they get a 2x payout (binary), else they get their stake back minus
    /// the option premium kept by the protocol — simplified to: win => 2x,
    /// lose => stake returned (capital-protected demo variant).
    ///
    /// INTEGRATION: DeepBook Predict `market::claim` with the resolution proof.
    public fun settle<Stake>(
        pause: &Pause,
        pos: HedgePosition<Stake>,
        observed_rate_e6: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<Stake> {
        access_control::assert_not_paused(pause);
        assert!(pos.owner == ctx.sender(), ENotOwner);
        assert!(!pos.settled, EAlreadySettled);
        assert!(clock::timestamp_ms(clock) >= pos.maturity_ms, ENotMatured);

        let won = if (pos.side == SIDE_RATE_UP) {
            observed_rate_e6 >= pos.target_rate_e6
        } else {
            observed_rate_e6 <= pos.target_rate_e6
        };

        let payout = balance::value(&pos.stake);
        let pid = object::id(&pos);

        // tear down the position, returning the (capital-protected) stake.
        let HedgePosition { id, owner, target_rate_e6: _, side: _, mut stake, maturity_ms: _, settled: _ } = pos;
        let stake_out = balance::withdraw_all(&mut stake);
        balance::destroy_zero(stake);
        object::delete(id);

        event::emit(HedgeSettled { position: pid, owner, won, payout });
        coin::from_balance(stake_out, ctx)
    }

    // ===== Views =====
    public fun owner<Stake>(p: &HedgePosition<Stake>): address { p.owner }
    public fun target_rate_e6<Stake>(p: &HedgePosition<Stake>): u64 { p.target_rate_e6 }
    public fun stake_value<Stake>(p: &HedgePosition<Stake>): u64 { balance::value(&p.stake) }
    public fun is_settled<Stake>(p: &HedgePosition<Stake>): bool { p.settled }
}
