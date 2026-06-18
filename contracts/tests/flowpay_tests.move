#[test_only]
module flowpay::flowpay_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};

    use flowpay::access_control::{Self, AdminCap, Pause};
    use flowpay::oracle::{Self, OracleRegistry};
    use flowpay::lending::{Self, LendingMarket};
    use flowpay::dex::{Self, DexMarket};
    use flowpay::borrow_guard::{Self, RiskParams};
    use flowpay::cashback_mint::{Self, CashbackTreasury, CASHBACK_MINT};
    use flowpay::flow_vault::{Self, FlowVault};
    use flowpay::smart_router;
    use flowpay::test_coins::{Self, USDC, BTC};

    const ADMIN: address = @0xA11CE;
    const USER: address = @0xBEEF;
    const MERCHANT: address = @0xCAFE;

    // USD/e6: BTC = $60,000 ; USDC = $1
    const BTC_PRICE_E6: u64 = 60_000_000_000;
    const USDC_PRICE_E6: u64 = 1_000_000;

    // Bring up all shared objects + an AdminCap held by ADMIN. Returns a Clock.
    fun bootstrap(scen: &mut Scenario): Clock {
        ts::next_tx(scen, ADMIN);
        {
            access_control::init_for_testing(ts::ctx(scen));
            oracle::init_for_testing(ts::ctx(scen));
            lending::init_for_testing(ts::ctx(scen));
            dex::init_for_testing(ts::ctx(scen));
            borrow_guard::init_for_testing(ts::ctx(scen));
            cashback_mint::init_for_testing(ts::ctx(scen));
        };
        ts::next_tx(scen, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(scen));
        clock
    }

    // Push fresh prices for BTC + USDC and set BTC LTV to 70%.
    fun seed_oracle_and_risk(scen: &mut Scenario, clock: &Clock) {
        ts::next_tx(scen, ADMIN);
        {
            let admin = ts::take_from_sender<AdminCap>(scen);
            let mut reg = ts::take_shared<OracleRegistry>(scen);
            let mut params = ts::take_shared<RiskParams>(scen);
            oracle::push_price<BTC>(&admin, &mut reg, BTC_PRICE_E6, 0, clock);
            oracle::push_price<USDC>(&admin, &mut reg, USDC_PRICE_E6, 0, clock);
            borrow_guard::set_ltv<BTC>(&admin, &mut params, 7_000);
            ts::return_shared(reg);
            ts::return_shared(params);
            ts::return_to_sender(scen, admin);
        };
    }

    // Seed a BTC->USDC DeepBook pool. price_e9 = quote micro-units per base
    // micro-unit * 1e9. BTC has 8 decimals, USDC 6. 1 BTC (1e8) -> $60k (6e10
    // USDC micro). price_e9 = (6e10 / 1e8) * 1e9 = 6e11.
    fun seed_dex(scen: &mut Scenario) {
        ts::next_tx(scen, ADMIN);
        {
            let mut market = ts::take_shared<DexMarket>(scen);
            let base_seed = test_coins::mint_btc(100_000_000, ts::ctx(scen)); // 1 BTC
            let quote_seed = test_coins::mint_usdc(100_000_000_000, ts::ctx(scen)); // 100k USDC
            dex::create_pool<BTC, USDC>(&mut market, base_seed, quote_seed, 600_000_000_000);
            ts::return_shared(market);
        };
    }

    // ---------------------------------------------------------------
    // 1. Deposit / withdraw accounting through the Scallop adapter.
    // ---------------------------------------------------------------
    #[test]
    fun test_deposit_withdraw_accounting() {
        let mut scen = ts::begin(ADMIN);
        let clock = bootstrap(&mut scen);

        ts::next_tx(&mut scen, USER);
        let mut vault = flow_vault::new(ts::ctx(&mut scen));

        ts::next_tx(&mut scen, USER);
        {
            let mut market = ts::take_shared<LendingMarket>(&mut scen);
            let pause = ts::take_shared<Pause>(&mut scen);
            let btc = test_coins::mint_btc(50_000_000, ts::ctx(&mut scen)); // 0.5 BTC
            flow_vault::deposit<BTC>(&mut vault, &mut market, &pause, btc);

            // sCoin balance should equal deposit at index 1:1.
            assert!(flow_vault::scoin_balance<BTC>(&vault) == 50_000_000, 0);
            assert!(flow_vault::underlying_balance<BTC>(&vault, &market) == 50_000_000, 1);

            // withdraw half
            let out = flow_vault::withdraw<BTC>(&mut vault, &mut market, &pause, 20_000_000, ts::ctx(&mut scen));
            assert!(coin::value(&out) == 20_000_000, 2);
            assert!(flow_vault::scoin_balance<BTC>(&vault) == 30_000_000, 3);
            test_coins::burn(out);

            ts::return_shared(market);
            ts::return_shared(pause);
        };

        transfer::public_transfer(vault, USER);
        clock::destroy_for_testing(clock);
        ts::end(scen);
    }

    // ---------------------------------------------------------------
    // 2. Atomic spend happy path (Scallop -> DeepBook -> merchant -> cashback).
    // ---------------------------------------------------------------
    #[test]
    fun test_atomic_spend_happy_path() {
        let mut scen = ts::begin(ADMIN);
        let clock = bootstrap(&mut scen);
        seed_oracle_and_risk(&mut scen, &clock);
        seed_dex(&mut scen);

        // user funds vault with 0.5 BTC
        ts::next_tx(&mut scen, USER);
        let mut vault = flow_vault::new(ts::ctx(&mut scen));
        ts::next_tx(&mut scen, USER);
        {
            let mut market = ts::take_shared<LendingMarket>(&mut scen);
            let pause = ts::take_shared<Pause>(&mut scen);
            let btc = test_coins::mint_btc(50_000_000, ts::ctx(&mut scen));
            flow_vault::deposit<BTC>(&mut vault, &mut market, &pause, btc);
            ts::return_shared(market);
            ts::return_shared(pause);
        };

        // spend $30 to merchant, selling BTC, settled in USDC
        ts::next_tx(&mut scen, USER);
        {
            let mut lending_market = ts::take_shared<LendingMarket>(&mut scen);
            let mut dex_market = ts::take_shared<DexMarket>(&mut scen);
            let reg = ts::take_shared<OracleRegistry>(&mut scen);
            let params = ts::take_shared<RiskParams>(&mut scen);
            let mut cashback = ts::take_shared<CashbackTreasury>(&mut scen);
            let pause = ts::take_shared<Pause>(&mut scen);

            // $30 = 30_000_000 usd_e6. BTC 8 decimals.
            smart_router::spend<BTC, USDC>(
                &mut vault, &mut lending_market, &mut dex_market, &reg, &params,
                &mut cashback, &pause, &clock, MERCHANT, 30_000_000, 8, ts::ctx(&mut scen),
            );

            ts::return_shared(lending_market);
            ts::return_shared(dex_market);
            ts::return_shared(reg);
            ts::return_shared(params);
            ts::return_shared(cashback);
            ts::return_shared(pause);
        };

        // merchant received USDC (~ $30 minus 0.1% dex fee)
        ts::next_tx(&mut scen, MERCHANT);
        {
            let paid = ts::take_from_sender<Coin<USDC>>(&scen);
            let v = coin::value(&paid);
            // expected ~ 30_000_000 * 0.999 = 29_970_000
            assert!(v >= 29_900_000 && v <= 30_000_000, 100);
            ts::return_to_sender(&scen, paid);
        };

        // user received FLOW cashback (1:1 of usd_e6 by default rate)
        ts::next_tx(&mut scen, USER);
        {
            let flow = ts::take_from_sender<Coin<CASHBACK_MINT>>(&scen);
            assert!(coin::value(&flow) == 30_000_000, 101);
            ts::return_to_sender(&scen, flow);
        };

        transfer::public_transfer(vault, USER);
        clock::destroy_for_testing(clock);
        ts::end(scen);
    }

    // ---------------------------------------------------------------
    // 3. BorrowGuard rejects a borrow on a STALE oracle.
    // ---------------------------------------------------------------
    #[test]
    #[expected_failure(abort_code = flowpay::oracle::EPriceStale)]
    fun test_stale_oracle_rejected() {
        let mut scen = ts::begin(ADMIN);
        let mut clock = bootstrap(&mut scen);
        seed_oracle_and_risk(&mut scen, &clock);

        // advance clock far beyond the 60s staleness window
        clock::increment_for_testing(&mut clock, 120_000);

        ts::next_tx(&mut scen, USER);
        {
            let reg = ts::take_shared<OracleRegistry>(&mut scen);
            // should abort EPriceStale
            borrow_guard::require_fresh_oracle<BTC>(&reg, &clock);
            ts::return_shared(reg);
        };

        clock::destroy_for_testing(clock);
        ts::end(scen);
    }

    // ---------------------------------------------------------------
    // 4. BorrowGuard rejects an over-LTV borrow.
    // ---------------------------------------------------------------
    #[test]
    #[expected_failure(abort_code = flowpay::borrow_guard::ELtvExceeded)]
    fun test_ltv_exceeded_rejected() {
        let mut scen = ts::begin(ADMIN);
        let clock = bootstrap(&mut scen);
        seed_oracle_and_risk(&mut scen, &clock);

        ts::next_tx(&mut scen, USER);
        {
            let params = ts::take_shared<RiskParams>(&mut scen);
            // BTC LTV = 70%. Collateral $100, try to borrow $80 -> reject.
            borrow_guard::check_borrow_ltv<BTC>(&params, 100_000_000, 80_000_000);
            ts::return_shared(params);
        };

        clock::destroy_for_testing(clock);
        ts::end(scen);
    }

    // ---------------------------------------------------------------
    // 5. Cashback minting via the spend path increases total supply.
    // ---------------------------------------------------------------
    #[test]
    fun test_cashback_minting() {
        let mut scen = ts::begin(ADMIN);
        let clock = bootstrap(&mut scen);

        ts::next_tx(&mut scen, ADMIN);
        {
            let admin = ts::take_from_sender<AdminCap>(&scen);
            let mut cashback = ts::take_shared<CashbackTreasury>(&mut scen);
            assert!(cashback_mint::total_supply(&cashback) == 0, 0);
            cashback_mint::reward_admin(&admin, &mut cashback, USER, 25_000_000, ts::ctx(&mut scen));
            assert!(cashback_mint::total_supply(&cashback) == 25_000_000, 1);
            ts::return_shared(cashback);
            ts::return_to_sender(&scen, admin);
        };

        ts::next_tx(&mut scen, USER);
        {
            let flow = ts::take_from_sender<Coin<CASHBACK_MINT>>(&scen);
            assert!(coin::value(&flow) == 25_000_000, 2);
            ts::return_to_sender(&scen, flow);
        };

        clock::destroy_for_testing(clock);
        ts::end(scen);
    }

    // ---------------------------------------------------------------
    // 6. Pause blocks deposits (and by extension the whole spend flow).
    // ---------------------------------------------------------------
    #[test]
    #[expected_failure(abort_code = flowpay::access_control::EPaused)]
    fun test_pause_blocks_deposit() {
        let mut scen = ts::begin(ADMIN);
        let clock = bootstrap(&mut scen);

        // admin flips emergency pause
        ts::next_tx(&mut scen, ADMIN);
        {
            let admin = ts::take_from_sender<AdminCap>(&scen);
            let mut pause = ts::take_shared<Pause>(&mut scen);
            access_control::pause(&admin, &mut pause, ts::ctx(&mut scen));
            assert!(access_control::is_paused(&pause), 0);
            ts::return_shared(pause);
            ts::return_to_sender(&scen, admin);
        };

        ts::next_tx(&mut scen, USER);
        let mut vault = flow_vault::new(ts::ctx(&mut scen));
        ts::next_tx(&mut scen, USER);
        {
            let mut market = ts::take_shared<LendingMarket>(&mut scen);
            let pause = ts::take_shared<Pause>(&mut scen);
            let btc = test_coins::mint_btc(10_000_000, ts::ctx(&mut scen));
            // should abort EPaused
            flow_vault::deposit<BTC>(&mut vault, &mut market, &pause, btc);
            ts::return_shared(market);
            ts::return_shared(pause);
        };

        transfer::public_transfer(vault, USER);
        clock::destroy_for_testing(clock);
        ts::end(scen);
    }

    // ---------------------------------------------------------------
    // 7. Margin "Spend Tomorrow" open + repay lifecycle.
    // ---------------------------------------------------------------
    #[test]
    fun test_margin_open_repay() {
        use flowpay::margin_bridge;

        let mut scen = ts::begin(ADMIN);
        let clock = bootstrap(&mut scen);
        seed_oracle_and_risk(&mut scen, &clock);

        // seed lending pool with USDC liquidity so margin can draw it
        ts::next_tx(&mut scen, ADMIN);
        {
            let mut market = ts::take_shared<LendingMarket>(&mut scen);
            let usdc = test_coins::mint_usdc(1_000_000_000, ts::ctx(&mut scen));
            let scoin = lending::deposit<USDC>(&mut market, usdc);
            // park the sCoin in the admin account; pool now has liquidity
            transfer::public_transfer(
                wrap_scoin<USDC>(scoin, ts::ctx(&mut scen)), ADMIN
            );
            ts::return_shared(market);
        };

        // user opens a $50 BNPL position backed by $1000 collateral (LTV ok)
        ts::next_tx(&mut scen, USER);
        {
            let pause = ts::take_shared<Pause>(&mut scen);
            let params = ts::take_shared<RiskParams>(&mut scen);
            let reg = ts::take_shared<OracleRegistry>(&mut scen);
            let mut market = ts::take_shared<LendingMarket>(&mut scen);

            let (mut pos, funds) = margin_bridge::open_position<BTC, USDC>(
                &pause, &params, &reg, &mut market,
                1_000_000_000, // $1000 collateral usd_e6
                50_000_000,    // borrow 50 USDC (50e6 units, 6 decimals)
                6,
                &clock, ts::ctx(&mut scen),
            );
            assert!(coin::value(&funds) == 50_000_000, 0);
            assert!(margin_bridge::debt<BTC, USDC>(&pos) == 50_000_000, 1);

            // repay fully from "incoming salary"
            let change = margin_bridge::repay<BTC, USDC>(&pause, &mut market, &mut pos, funds, ts::ctx(&mut scen));
            assert!(margin_bridge::debt<BTC, USDC>(&pos) == 0, 2);
            assert!(coin::value(&change) == 0, 3);
            margin_bridge::close<BTC, USDC>(pos);
            test_coins::burn(change);

            ts::return_shared(pause);
            ts::return_shared(params);
            ts::return_shared(reg);
            ts::return_shared(market);
        };

        clock::destroy_for_testing(clock);
        ts::end(scen);
    }

    // helper to move a bare SCoin into something with `key` for parking in tests
    #[test_only]
    public struct SCoinBox<phantom T> has key, store { id: UID, scoin: lending::SCoin<T> }
    #[test_only]
    fun wrap_scoin<T>(scoin: lending::SCoin<T>, ctx: &mut TxContext): SCoinBox<T> {
        SCoinBox<T> { id: object::new(ctx), scoin }
    }
}
