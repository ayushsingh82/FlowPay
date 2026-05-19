# Top 3 DeFi & Payments Ideas — Comparison

All three combine **consumer payments UX + DeFi underneath + all sponsors (OZ + Scallop + DeepBook)**. Pick based on which angle you want to own.

---

## Quick Comparison

| # | Idea | One-liner | Sponsor coverage | Build difficulty | Demo wow | Win odds |
|---|------|-----------|------------------|------------------|----------|----------|
| 1 | **FlowPay** | Pay anyone without exiting your yield position (atomic borrow + swap + send in one PTB) | OZ + Scallop + DeepBook (all core) | 🟡 Medium-High | 🔥🔥🔥 | ⭐⭐⭐⭐⭐ |
| 2 | **MerchantFlow** | Merchant SDK: accept any Sui token, auto-settle in preferred token, idle balance earns on Scallop | OZ (audited core) + Scallop (treasury yield) + DeepBook (routing engine) | 🟢 Medium | 🔥🔥 | ⭐⭐⭐⭐ |
| 3 | **Remit-flo** | Cross-border remittance: send USDC, recipient gets local-pegged token, optional rate-lock via DeepBook Predict | OZ (fee/access) + Scallop (sender float yield) + DeepBook (Predict for FX hedge) | 🟡 Medium | 🔥🔥🔥 | ⭐⭐⭐⭐ |

---

## Detailed Breakdown

### 🥇 #1 — FlowPay (Consumer wallet)

| Dimension | Detail |
|-----------|--------|
| **Consumer hook** | "Your money keeps earning while you spend it" — Cash App UX with built-in 5% APY |
| **Target user** | 20-40yr-old stablecoin holders in LATAM/SEA/Africa |
| **Scallop usage** | Core dependency — every deposit auto-routed to Scallop pools; sCoins as vault accounting |
| **DeepBook usage** | Spot routing for any-token-in / any-token-out merchant payments |
| **OZ angle** | Audited vault standard, access control, emergency pause, oracle staleness guards |
| **2025 reference** | Combines MizuPay (collateral spend) + PIVY (privacy add-on) + Magma (invisible yield) into one consumer product |
| **Killer demo** | Show Sui explorer with single PTB doing borrow+swap+send, while APY counter keeps ticking on original deposit |
| **Risk** | Most ambitious — atomic PTB choreography across 3 protocols |

### 🥈 #2 — MerchantFlow (B2B payment rails)

| Dimension | Detail |
|-----------|--------|
| **Consumer hook** | "Drop-in checkout for Sui — accept any token, sleep on stablecoin yield" |
| **Target user** | Web3 merchants, e-commerce stores, NFT marketplaces, SaaS |
| **Scallop usage** | Merchant's accumulated balance auto-deposits to Scallop until withdrawal; sCoins backing |
| **DeepBook usage** | Core routing — buyer pays Token A, merchant receives preferred Token B, DeepBook handles in real-time |
| **OZ angle** | Audited payment splitter, refund logic, role-based merchant access, emergency pause |
| **2025 reference** | No 2025 winner targeted merchants directly (only consumer wallets like PIVY) — clear white space |
| **Killer demo** | Live checkout on a fake e-commerce site, buyer pays in SUI, merchant sees USDC arrive + auto-earning, dashboard shows yield accrued in seconds |
| **Risk** | Less consumer-flashy; needs strong merchant pitch + at least one design partner mention |

### 🥉 #3 — Remit-flo (Cross-border remittance)

| Dimension | Detail |
|-----------|--------|
| **Consumer hook** | "Send money home in seconds, locked at today's rate, for $0.01 fee" |
| **Target user** | Cross-border workers (Philippines, Mexico, India, Nigeria corridors) |
| **Scallop usage** | Sender's pre-funded balance earns yield between sends; recipient inbox earns until withdrawal |
| **DeepBook usage** | **Spot** for FX swap on arrival + **Predict** for "lock in today's rate" feature (huge differentiator) |
| **OZ angle** | Audited fee router, KYC-gated access pattern (optional), payment guarantees |
| **2025 reference** | No 2025 winner explicitly tackled remittance corridors — geographically focused white space |
| **Killer demo** | Send $100 from US → Philippines, recipient gets PHP-pegged token in 1s, side-by-side comparison with Western Union ($15 fee, 3 days) |
| **Risk** | Needs at least one local-pegged stablecoin/asset on Sui (research dependency) |

---

## Decision Matrix

**Pick FlowPay if:**
- You want maximum demo wow-factor and the broadest consumer appeal
- You're comfortable with complex Move + multi-protocol PTB choreography
- You want the strongest "uniquely Sui" story (PTBs are the hook)

**Pick MerchantFlow if:**
- You prefer cleaner, more focused scope
- You can line up 1-2 design partner merchants for the demo
- You want a clearer B2B revenue model story for judges

**Pick Remit-flo if:**
- You have a strong personal story / market knowledge in remittance corridors
- You want the most emotionally resonant pitch ("families, not fees")
- You're OK depending on a local-pegged asset partner

---

## My Recommendation

**FlowPay** — highest ceiling. The atomic "spend without leaving yield" demo is genuinely jaw-dropping and uses Sui's actual differentiator (PTBs). It's also the most natural fit for ALL three sponsors at once, which means you're eligible for max prize stacking.

**Backup:** if scope feels too big for the team, fall back to **MerchantFlow** — same core tech but narrower surface area.
