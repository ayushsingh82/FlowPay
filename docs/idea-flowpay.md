# FlowPay — The Payment App Where Your Money Never Stops Earning

> **One-line pitch:** A consumer payment app on Sui where your balance auto-earns yield on Scallop, and you spend without ever exiting your yield position — powered by Scallop borrow + DeepBook atomic routing inside a single Sui PTB.

**Track:** DeFi & Payments (Core)
**Sponsor leverage:** OpenZeppelin (1st prize) + Scallop (3rd prize) + DeepBook (specialized track / future)

---

## 1. The Problem

Today's "stablecoin payment apps" are a joke for the user:

1. To spend, you withdraw from yield → lose APY
2. To swap tokens, you open a DEX → 3 clicks, slippage, gas
3. To pay a merchant who wants USDC when you hold SUI → manual swap + send
4. Self-custodial wallets are scary; custodial apps (Cash App, Venmo) don't earn anything

Meanwhile the average consumer balance sits idle. **Billions in stablecoins earn 0%** because earning + spending are separate apps.

## 2. The Insight

**Sui's PTB (Programmable Transaction Block) lets us do something no other chain can:** in a single atomic transaction, you can borrow from a lending market, swap on an orderbook, send to a merchant, and update accounting state — all-or-nothing.

That means spending $20 on coffee can be:
```
1. Borrow $20 USDC against my Scallop sSUI collateral position
2. Route through DeepBook for best execution (if merchant wants a different token)
3. Send to merchant
4. Update my borrow ledger
```
…**in one atomic transaction**, in <1 second, while my full deposit keeps compounding on Scallop.

This is the "no-exit-yield" spend. It's the killer feature.

## 3. Target User

**Primary (consumer):** crypto-curious 20-40yr-olds in emerging markets (LATAM, SEA, Africa) who already hold stablecoins for protection against local inflation, and want to *use* them — not just hodl them.

**Secondary (power user):** Sui-native DeFi users who want a daily-driver payment UX without leaving their yield positions.

## 4. Product Surface (MVP)

### Mobile-first PWA, three screens:

**Home**
- Big balance number + live APY counter ticking up
- "Send" / "Receive" / "Top up" buttons
- Recent activity (sends, yield earned, borrows repaid)

**Send / Pay**
- Scan QR or paste address
- Auto-detect merchant's preferred token
- Toggle: "Pay from balance" (instant, no yield loss) vs "Withdraw & send"
- Confirm → 1 PTB → done

**Earn**
- See deposit breakdown across Scallop pools
- "Borrow power" indicator (max safe spend without liquidation risk)
- Toggle auto-repay (incoming receipts auto-pay outstanding borrows)

## 5. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  FlowPay PWA (React + @mysten/dapp-kit)                 │
│  - zkLogin for onboarding (Google / Apple → wallet)     │
│  - Slush wallet integration for power users             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  FlowPay Move Modules (audited against OZ patterns)     │
│  ├── FlowVault: user deposit object + accounting        │
│  ├── SpendRouter: builds PTBs for atomic spend          │
│  ├── BorrowGuard: pre-trade liquidation safety check    │
│  └── EmergencyPause: OZ-style circuit breaker           │
└──────┬──────────────────┬───────────────────┬───────────┘
       │                  │                   │
       ▼                  ▼                   ▼
   Scallop SDK       DeepBook SDK        Pyth Oracle
   (lend/borrow)    (spot routing)     (price + LTV)
```

### Single atomic spend PTB (pseudo-Move):
```move
// 1. Verify spend is within safe borrow capacity
borrow_guard::check_health_factor(user_vault, amount);

// 2. Borrow from Scallop against collateral
let usdc = scallop::borrow<USDC>(user_obligation, amount);

// 3. (Optional) Route through DeepBook if merchant wants a different token
let payout = deepbook::swap_exact_in(usdc, merchant_token, min_out);

// 4. Transfer to merchant
transfer::public_transfer(payout, merchant_address);

// 5. Emit event for analytics
event::emit(SpendEvent { user, amount, merchant });
```

## 6. Sponsor Integration (concrete)

### 🥇 OpenZeppelin (1st place sponsor)
- **Reuse OZ Move patterns** for: access control, pausability, upgrade authority, role-based emergency stops
- **Standardize FlowVault as an OZ-compatible vault interface** — submit it as a candidate for OZ Sui standards
- **Formal verification** of BorrowGuard (the safety-critical module) — call it out in the demo
- **Multi-layer audit story:** OZ Defender-style monitoring + Pyth oracle staleness checks + circuit breakers

### 🥉 Scallop (3rd place sponsor)
- **Core dependency, not bolt-on:** every dollar deposited goes into Scallop pools by default
- **Use sCoins** as the underlying vault accounting token (free composability)
- **Use Scallop flashloans** for "instant swap on send" when user prefers swap over borrow
- **veSCA flywheel:** FlowPay treasury locks SCA → boosts users' rates → product moat

### 🐬 DeepBook (specialized track potential)
- **Spot routing** for any-token-in / any-token-out merchant payments
- **DeepBook Predict integration** for "lock in FX rate" feature (e.g., "I owe €500 next month — lock the EUR rate now via a binary market")
- This alone could qualify FlowPay for the DeepBook specialized prize pool ($70K) in addition to DeFi & Payments

## 7. Why It Beats 2025 Winners

| 2025 Winner | What they did | What FlowPay does differently |
|-------------|---------------|-------------------------------|
| **MizuPay** | LBTC → mzUSD mint → real-world payment | Full bidirectional pay+earn+borrow loop, any collateral, no new stablecoin needed |
| **PIVY** | Stealth address payment links | We can *add* PIVY-style stealth as a privacy toggle (no rebuild) — broader product |
| **Magma Finance** | AI-routed yield vaults | Vault is invisible to user — payments app is the interface, yield is automatic |
| **Coindrip** | Programmable token streams | Streams are one feature (payroll/subscriptions) inside a consumer app |
| **PIVY + Coindrip + Magma combined** | Three separate things | One coherent consumer product |

**The thesis:** 2025 winners built powerful primitives. 2026 wins go to the team that **packages those primitives into a product your mom could use.**

## 8. Demo Day Flow (5 min)

1. **0:00 — Hook (15s):** "Show of hands — how many of you have crypto that's just sitting there earning 0%? Yeah. Today I'm going to spend $5 on coffee without ever touching my yield position."
2. **0:15 — Onboard (30s):** Open PWA → Sign in with Google (zkLogin) → wallet created → top up $100 USDC
3. **0:45 — See yield (15s):** Show APY counter ticking. "This is on Scallop. Right now."
4. **1:00 — The killer demo (90s):** Scan a QR for $20 coffee at the booth → tap pay → show the single PTB in Sui explorer with all 4 ops (borrow + swap + send + event) → coffee is paid → APY counter *still ticking from the original $100 deposit*.
5. **2:30 — Cross-token (45s):** Friend in Vietnam wants VND-pegged token. Send them $50 → DeepBook auto-routes → they receive their token. One PTB.
6. **3:15 — FX lock (60s):** "I owe €500 next month." Open Predict tab → buy EUR/USD binary → rate is locked.
7. **4:15 — Security (30s):** Show OZ-pattern access control module + Pyth oracle staleness check + emergency pause. "If anything breaks, we freeze."
8. **4:45 — Vision (15s):** "FlowPay turns every Sui wallet into a checking account that earns. We're already integrated with Scallop, DeepBook, and Pyth on day 1."

## 9. MVP Scope (Hackathon Build Plan)

### Week 1-2 — Foundations
- Move modules: FlowVault, SpendRouter, BorrowGuard (with tests)
- Scallop SDK integration on testnet
- Basic PWA shell + zkLogin onboarding

### Week 3-4 — Core Loop
- Atomic spend PTB end-to-end (deposit → borrow → send works)
- DeepBook spot routing integration
- Send/Receive screens, QR scan, contact list

### Week 5-6 — Polish
- Earn screen with live APY, borrow health bar
- Recurring payments (Coindrip-style for subscriptions/payroll — bonus)
- Emergency pause + Pyth oracle guard
- DeepBook Predict integration for FX lock (bonus, qualifies for specialized track)

### Week 7-8 — Demo prep
- Audit checklist (OZ patterns documented)
- 3-minute demo video
- Live testnet with seeded merchants
- Pitch deck

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Scallop borrow rates spike → users get liquidated | BorrowGuard enforces conservative LTV (e.g., max 40%); auto-repay from incoming receipts |
| DeepBook lacks the merchant's token pair | Fallback to Cetus / native DEX routing; show error gracefully |
| Oracle stale → bad pricing | Pyth staleness check in BorrowGuard; transaction reverts |
| zkLogin onboarding too slow live | Pre-warm wallet creation during talk intro |
| Judges think it's "just a wallet" | Demo the atomic PTB — that's the differentiator they can't dismiss |

## 11. What I Need From You

- ✅ Confirm this is the direction
- 🤔 Solo or team? If team, how many? Affects MVP scope realism
- 🤔 Your Move-on-Sui experience level? Modules are 60% of the build
- 🤔 OK to dual-submit (DeFi & Payments + DeepBook specialized)?

---

## TL;DR

**FlowPay = Cash App UX × Scallop yield × DeepBook routing, glued together by Sui's atomic PTB superpower.**

It's consumer-first, sponsor-aligned (OZ + Scallop + DeepBook), references but doesn't copy 2025 winners (MizuPay, PIVY, Magma, Coindrip), and has a 30-second demo that makes judges go "wait, you can do that?"
