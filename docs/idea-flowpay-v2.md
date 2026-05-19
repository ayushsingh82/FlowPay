# FlowPay v2 — Multi-Asset Payment Wallet

> **One-line pitch:** A consumer payment wallet where you hold a *basket* of assets (SUI, USDC, BTC, ETH), earn yield on idle balance via Scallop, and every payment routes through DeepBook — turning your wallet into a smart spending account that picks the optimal asset to sell, hedges your bills, and earns DEEP cashback.

**Track:** DeFi & Payments (Core) + DeepBook (Specialized — dual eligible)
**Sponsor leverage:** OpenZeppelin (1st) + Scallop (3rd) + DeepBook ($70K pool)

---

## Sponsor Depth: v1 vs v2

| Sponsor | FlowPay v1 | **FlowPay v2** | Change |
|---------|-----------|----------------|--------|
| **Scallop** | 🟢 Core (borrow + yield) | 🟢 **Core** (same) | Maintained |
| **DeepBook** | 🟡 Optional (only on cross-token) | 🟢 **Core** (every spend + Predict + Margin) | **Upgraded** |
| **OpenZeppelin** | 🟡 Style guide | 🟢 **Core** (multi-asset = oracle/vault safety becomes critical) | **Upgraded** |

v2 makes DeepBook a **runtime dependency on every transaction**, not a "nice if needed."

---

## The Insight

Real consumer crypto wallets are **multi-asset**. Users in emerging markets hold:
- 40% stablecoins
- 30% BTC/ETH
- 20% native chain token (SUI)
- 10% memecoins / random

Every time they spend, they face: "Which one do I sell? Where? What's the best price?" Most apps make them do this manually → friction kills adoption.

**FlowPay v2 makes the wallet itself smart.** Every spend triggers:
```
SmartSpend → pick optimal asset to sell → route via DeepBook → settle in merchant's preferred token → all in one PTB
```

DeepBook is the brain. Scallop is the yield. OpenZeppelin is the safety.

---

## Core Features (Hackathon MVP)

### 1. 🧠 SmartSpend (every transaction uses DeepBook)
- Wallet holds a basket of assets
- On spend, app runs optimization: "to send $20 USDC to merchant, sell from which holding?"
- Considers: current price, DeepBook spread, your yield position on Scallop, gas
- Routes through DeepBook spot, settles atomically in one PTB
- **DeepBook hits on every transaction → strongest sponsor signal**

### 2. 💰 Yield Vault (Scallop core)
- Idle balance auto-deposits into Scallop (per-asset pools)
- sCoins as accounting layer
- Live APY counter per asset
- Optional "no-exit-yield" spend mode → borrow against deposit instead of selling (v1's killer feature retained)

### 3. 🔒 Lock Rate (DeepBook Predict)
- "I owe ₹40,000 INR rent next month" → app shows USD/INR Predict markets
- One tap to lock today's rate via binary option
- Future-bill calendar with hedge suggestions
- **First consumer-facing use of DeepBook Predict in a payment app**

### 4. ⏰ Spend Tomorrow (DeepBook Margin)
- BNPL without selling your bag
- App opens a small short margin position via DeepBook to get spending liquidity
- Auto-repay from next incoming payment
- Conservative LTV enforced by OZ-pattern BorrowGuard

### 5. 🎁 DEEP Cashback
- Every spend earns DEEP token rewards (using DeepBook's loyalty hooks)
- Stake DEEP for fee discounts on future spends
- Self-reinforcing flywheel that grows DeepBook's user base

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  FlowPay PWA                                             │
│  • zkLogin onboarding                                    │
│  • Multi-asset balance dashboard                         │
│  • Spend / Earn / Hedge tabs                             │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  FlowPay Move Modules (OZ-pattern audited)               │
│  ├── FlowVault: multi-asset deposits + sCoin accounting  │
│  ├── SmartRouter: per-tx asset selection + PTB builder   │
│  ├── BorrowGuard: LTV + oracle staleness check           │
│  ├── HedgeManager: Predict position lifecycle            │
│  ├── MarginBridge: DeepBook margin for BNPL              │
│  └── CashbackMint: DEEP reward distribution              │
└─┬────────┬──────────┬──────────┬─────────┬──────────────┘
  │        │          │          │         │
  ▼        ▼          ▼          ▼         ▼
Scallop  DeepBook  DeepBook   DeepBook   Pyth
(lend)   (Spot)    (Predict)  (Margin)   (oracle)
```

### Every spend = one PTB:
```move
// 1. SmartRouter picks optimal asset to sell
let (asset, amount_in) = smart_router::pick_optimal(user_vault, target_usd);

// 2. Withdraw from Scallop position (or borrow if no-exit mode)
let funds = scallop::withdraw_or_borrow(user_obligation, asset, amount_in);

// 3. Route through DeepBook for best execution
let payout = deepbook::swap_exact_in(funds, merchant_token, min_out);

// 4. Transfer to merchant
transfer::public_transfer(payout, merchant_address);

// 5. Mint DEEP cashback for user
cashback_mint::reward(user, payout_value);

// 6. Emit event
event::emit(SpendEvent { user, asset_sold, merchant, deep_earned });
```

---

## Sponsor Integration (Concrete)

### 🥇 OpenZeppelin (1st prize sponsor)
- **Critical for multi-asset safety** — oracle staleness, slippage limits, per-asset LTV
- OZ-pattern access control on every module
- Emergency pause that halts all flows atomically
- Multi-asset = more risk surface = more value in OZ patterns
- **Pitch:** "We can't ship multi-asset wallets without battle-tested guardrails. We built ours from OZ Move patterns."

### 🥉 Scallop (3rd prize sponsor)
- **Yield engine for every asset** in the basket (SUI, USDC, BTC, ETH all auto-deposit)
- sCoins are the vault accounting tokens
- Borrow-against-collateral powers the "no-exit-yield" spend mode
- veSCA flywheel: FlowPay treasury locks SCA → boosts user rates

### 🐬 DeepBook (Specialized track — $70K pool)
- **Spot:** every spend transaction (SmartSpend)
- **Predict:** Lock Rate feature for FX hedging
- **Margin:** Spend Tomorrow BNPL feature
- **DEEP token:** Cashback rewards + staking
- **Four DeepBook primitives in one product** — strongest possible DeepBook integration
- **Dual-eligible: DeFi & Payments core prize ($30K) + DeepBook specialized prize**

---

## Why It Wins vs 2025 Winners

| 2025 Winner | What they did | FlowPay v2 differentiator |
|-------------|---------------|---------------------------|
| **MizuPay** | LBTC → mzUSD → pay | Any asset → any asset, no new stablecoin |
| **PIVY** | Stealth payment links | Privacy is one toggle inside a multi-feature wallet |
| **Magma** | AI yield routing | Yield invisible to user; payments app is the surface |
| **Kamo** | Yield tokenization | Yield is a background utility, not the product |
| **Coindrip** | Token streams | Streams are one mode (subscriptions, payroll) |
| **Pismo** | Perpetuals | We use DeepBook margin for *consumer* BNPL, not trader perps |

**Thesis:** 2025 winners shipped primitives. 2026 winners ship **integrated consumer products that consume multiple primitives**. FlowPay v2 consumes 4 DeepBook surfaces + Scallop + Pyth in one product.

---

## Demo Day Flow (5 min)

1. **0:00 — Hook:** "I have $1,000 split across SUI, USDC, and BTC, all earning yield. Watch what happens when I buy coffee."
2. **0:30 — SmartSpend:** Scan $5 QR → app shows "selling 0.0001 BTC via DeepBook (saves $0.02 vs selling SUI)" → tap pay → done in 800ms → APY counters still ticking.
3. **1:15 — Cross-token:** Send $50 to friend in Vietnam who wants VND token → DeepBook routes → friend receives instantly.
4. **2:00 — Lock Rate (Predict):** Open Bills tab → "Rent ₹40k due May 28" → app suggests USD/INR Predict binary → tap "Lock today's rate" → executed.
5. **3:00 — Spend Tomorrow (Margin):** "I want $200 now without selling my BTC" → app opens short via DeepBook Margin → $200 USDC arrives → auto-repays from incoming salary next week.
6. **3:45 — DEEP cashback:** Show DEEP balance growing from each spend, stake for 20% fee discount.
7. **4:15 — Safety:** Show OZ emergency pause + Pyth oracle staleness check + per-asset LTV caps.
8. **4:45 — Vision:** "FlowPay turns Sui wallets into smart checking accounts. We use Scallop, DeepBook Spot + Predict + Margin + DEEP, all in one product."

---

## MVP Build Plan (8 weeks)

### Week 1-2: Foundations
- FlowVault + SmartRouter Move modules
- Multi-asset deposit/withdraw on testnet (3 assets minimum: SUI, USDC, BTC-proxy)
- Scallop SDK integration

### Week 3-4: SmartSpend core loop
- DeepBook spot routing
- PTB builder for atomic spend (every flow tested)
- PWA shell + zkLogin + balance dashboard

### Week 5: Lock Rate (Predict)
- HedgeManager module
- Bills calendar + Predict market discovery UI
- One-tap hedge execution

### Week 6: Spend Tomorrow (Margin) + Cashback
- MarginBridge module (small scope: open/close short)
- CashbackMint with DEEP reward stream
- DEEP staking UI

### Week 7: Polish + Safety
- BorrowGuard hardening + Pyth oracle staleness
- OZ-pattern access control review
- Emergency pause testing

### Week 8: Demo
- 3-min video walkthrough
- Live testnet with 5 seeded merchants
- Pitch deck + technical README

---

## Scope Levers (if running tight)

**Must ship:** SmartSpend (DeepBook Spot) + Scallop yield + OZ safety
**Should ship:** Lock Rate (Predict)
**Nice to ship:** Spend Tomorrow (Margin) + DEEP cashback

Even the must-ship version uses all 3 sponsors deeply.

---

## Prize Stacking Math

| Prize | Eligibility | $ |
|-------|-------------|---|
| DeFi & Payments 1st place | OZ-aligned security story | $30,000 |
| DeepBook specialized pool | 4 DeepBook surfaces used | up to $70,000 share |
| Scallop bonus (3rd place sponsor) | Deep Scallop integration | bonus |
| University award (if applicable) | $2,500 |
| **Realistic stacked outcome** | | **$30K – $100K+** |

---

## TL;DR

**FlowPay v2 = a multi-asset consumer payment wallet where DeepBook powers every spend, Scallop earns on every idle dollar, and OpenZeppelin keeps it safe.**

It uses 4 DeepBook primitives (Spot + Predict + Margin + DEEP), Scallop as the yield engine, and OZ patterns as the safety layer — making it the **only one of our top 3 that's deep on all three sponsors**, and the only one dual-eligible for both DeFi & Payments + DeepBook specialized prize pools.
