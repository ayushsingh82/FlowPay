/// Test-only fungible asset types used across FlowPay unit tests.
/// These stand in for SUI / USDC / a BTC proxy in the multi-asset basket.
#[test_only]
module flowpay::test_coins {
    use sui::coin::{Self, Coin};

    /// Stand-in for USDC (merchant's preferred token).
    public struct USDC has drop {}
    /// Stand-in for a BTC proxy (an asset the user holds + sells).
    public struct BTC has drop {}
    /// Stand-in for SUI (native basket asset).
    public struct SUI_T has drop {}

    public fun mint_usdc(amount: u64, ctx: &mut TxContext): Coin<USDC> {
        coin::mint_for_testing<USDC>(amount, ctx)
    }
    public fun mint_btc(amount: u64, ctx: &mut TxContext): Coin<BTC> {
        coin::mint_for_testing<BTC>(amount, ctx)
    }
    public fun mint_sui(amount: u64, ctx: &mut TxContext): Coin<SUI_T> {
        coin::mint_for_testing<SUI_T>(amount, ctx)
    }

    public fun burn<T>(c: Coin<T>) {
        coin::burn_for_testing(c);
    }
}
