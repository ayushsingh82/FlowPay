# FlowPay — Move Smart Contracts

On-chain package for **FlowPay**, a multi-asset consumer payment wallet on Sui
(Sui Overflow 2026 — DeFi & Payments core track + DeepBook specialized track).

> Every spend is **one atomic PTB**: pick the optimal asset → withdraw from
> Scallop yield → route through DeepBook → pay the merchant → mint DEEP-style
> cashback → emit an event. Guarded end-to-end by OpenZeppelin-style patterns
> and a Pyth oracle staleness check.

Package name: `flowpay` · Edition: `2024.beta` · Named address: `flowpay = "0x0"`.

---

## Layout

```
contracts/
├── Move.toml
├── sources/
│   ├── access_control.move    # OZ patterns: AdminCap + emergency Pause
│   ├── oracle.move            # Pyth abstraction: Price + staleness guard
│   ├── borrow_guard.move      # LTV caps + oracle freshness + slippage guard
│   ├── flow_vault.move        # FlowVault: multi-asset deposits + sCoin layer
│   ├── smart_router.move      # SmartRouter: optimal-asset pick + atomic spend
│   ├── hedge_manager.move     # DeepBook Predict: Lock-Rate FX hedge lifecycle
│   ├── margin_bridge.move     # DeepBook Margin: "Spend Tomorrow" BNPL
│   ├── cashback_mint.move     # DEEP-style FLOW cashback minting
│   └── adapters/
│       ├── lending.move       # Scallop abstraction (deposit/withdraw/borrow + sCoin)
│       └── dex.move           # DeepBook Spot abstraction (swap_exact_in)
└── tests/
    ├── test_coins.move        # USDC / BTC / SUI stand-in coin types
    └── flowpay_tests.move     # unit tests (see "Tests" below)
```

The mainnet packages for Scallop / DeepBook / Pyth are **not vendored**. Their
integration points are modeled behind clean local adapters so the package
compiles and the spend flow runs standalone. Every spot where a real sponsor
call plugs in is marked with an `// INTEGRATION:` doc comment.

---

## Modules

| Module | Role |
|---|---|
| **`flow_vault` (FlowVault)** | One owned vault object per user. Deposits route into the Scallop adapter and are tracked as yield-bearing `SCoin` accounting tokens, so idle balance keeps earning. Multi-asset via dynamic fields keyed by `TypeName`. |
| **`smart_router` (SmartRouter)** | The brain. `pick_optimal` computes how much of an asset is needed to settle a USD bill at a fresh price; `spend` runs the full atomic flow. |
| **`borrow_guard` (BorrowGuard)** | Risk layer. Per-asset LTV caps, oracle-staleness gate (`require_fresh_oracle`), and a slippage floor check. Tuning is `AdminCap`-gated. |
| **`hedge_manager` (HedgeManager)** | DeepBook **Predict** lifecycle. Open a binary FX rate-lock against an upcoming bill, settle after maturity. |
| **`margin_bridge` (MarginBridge)** | DeepBook **Margin** for BNPL. Open a small position against vault collateral (LTV + freshness enforced), draw spend liquidity, auto-repay from incoming payment. |
| **`cashback_mint` (CashbackMint)** | DEEP-style `FLOW` reward token minted proportional to USD spent. |
| **`access_control`** | OZ-style `AdminCap` (Ownable/AccessControl) + shared `Pause` (Pausable). |
| **`oracle`** | Pyth abstraction: a `Price { usd_e6, conf_e6, publish_ms }` struct, USD<->amount conversion, and the staleness guard every consumer flows through. |
| **`lending` (adapter)** | Scallop abstraction: per-asset pools, `deposit`/`withdraw`/`borrow`/`repay`, sCoin exchange-index accrual. |
| **`dex` (adapter)** | DeepBook Spot abstraction: `swap_exact_in` with a `min_out` slippage guard. |

---

## The PTB spend flow (`smart_router::spend<Sold, Merchant>`)

Maps 1:1 to the "every spend = one PTB" pseudo-code in `docs/idea-flowpay-v2.md`:

```
0. [OZ]      assert_not_paused(pause)                     // emergency stop
1. [Pyth+OZ] require_fresh_oracle<Sold>(oracle, clock)    // staleness guard
2. [Router]  pick_optimal<Sold>(target_usd) -> amount_in  // verify affordable
3. [Scallop] flow_vault::take<Sold>(...) -> Coin<Sold>    // exit yield (or borrow)
4. [DeepBook]dex::swap_exact_in<Sold, Merchant>(min_out)  // best execution + slippage
5.           transfer::public_transfer(payout, merchant)  // settle in merchant token
6. [DEEP]    cashback_mint::reward(user, usd_value)        // loyalty mint
7.           event::emit(SpendEvent { ... })
```

All of it succeeds or reverts atomically in a single transaction.

---

## Where each sponsor plugs in

### OpenZeppelin (patterns) — `access_control` + `borrow_guard` + `oracle`
- `AdminCap` = Ownable/AccessControl admin role; gates every privileged op.
- `Pause` = Pausable; `assert_not_paused` is the first line of every mutating
  entry, so one flip halts deposits, spends, hedges, and margin atomically.
- `borrow_guard` enforces per-asset LTV caps and a slippage floor.
- `oracle::get_fresh_price` is the staleness guard (mirrors Pyth's max-age
  pattern). No consumer can read a price without passing it.

### Scallop — `adapters/lending` (used by `flow_vault`, `margin_bridge`)
- `deposit` → sCoin (`MarketCoin<T>`); `withdraw` → underlying; `borrow`/`repay`
  power the no-exit-yield spend mode. `// INTEGRATION: scallop::lend::deposit/withdraw`.
- sCoins are the vault's accounting tokens; the exchange `index` simulates APY.

### DeepBook (4 primitives)
- **Spot** — `adapters/dex::swap_exact_in`, called on **every** `spend`.
  `// INTEGRATION: deepbook::pool::swap_exact_base_for_quote`.
- **Predict** — `hedge_manager` open/settle (Lock Rate).
  `// INTEGRATION: deepbook_predict::market::buy / claim`.
- **Margin** — `margin_bridge` open/repay (Spend Tomorrow BNPL).
  `// INTEGRATION: deepbook_margin::account::borrow / repay`.
- **DEEP token** — `cashback_mint` mints loyalty rewards on every spend.

### Pyth — `oracle`
- `Price` mirrors Pyth's (price, conf, expo, publish_time). Replace the admin
  `push_price` with reads of a verified `PriceInfoObject`.
  `// INTEGRATION: pyth::pyth::get_price`.

---

## Build & test

Requires the [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install).

```bash
cd contracts
sui move build
sui move test
```

> ✅ Verified with **Sui CLI 1.73.2** (`framework/testnet`): `sui move build`
> compiles clean (only `type_name::get` deprecation warnings), and
> `sui move test` reports **7 passed, 0 failed**.

### Tests (`tests/flowpay_tests.move`)

| Test | Covers |
|---|---|
| `test_deposit_withdraw_accounting` | Deposit → sCoin mint → partial withdraw accounting |
| `test_atomic_spend_happy_path` | Full Scallop→DeepBook→merchant→cashback spend in one call |
| `test_stale_oracle_rejected` | `require_fresh_oracle` aborts `EPriceStale` past the window |
| `test_ltv_exceeded_rejected` | `check_borrow_ltv` aborts `ELtvExceeded` over the collateral factor |
| `test_cashback_minting` | FLOW cashback mints and increases total supply |
| `test_pause_blocks_deposit` | Emergency `Pause` aborts `EPaused` |
| `test_margin_open_repay` | "Spend Tomorrow" open + full repay + close lifecycle |

---

## Notes / caveats

- This is **hackathon-demo quality**: adapters model sponsor behavior with
  simple deterministic math (constant-rate swaps, index-based sCoin accrual,
  capital-protected binary hedges). Swapping in the real sponsor SDKs is a
  matter of replacing the adapter bodies at the marked `// INTEGRATION:` points.
- Prices are integer USD micro-dollars (`usd_e6`) for legibility; production
  would carry Pyth's `expo`/`conf` end-to-end.
