# DeFi & Payments — Idea Table

**Track:** Core — DeFi & Payments
**Sponsors:** OpenZeppelin (1st place), Scallop (3rd place), + DeepBook angle TBD
**Goal:** Pick ideas that (a) aren't reskins of 2025 winners, (b) lean into sponsor strengths, (c) ship in hackathon timeline.

## Sponsor angle cheat sheet
- **OpenZeppelin:** security, audited standards, access control, upgradeability, governance, formal verification → win by being the most *trustworthy / battle-tested* submission
- **Scallop:** lending money market, sCoins (lending derivatives), flashloans, veSCA, X-Oracle → win by *building on top of* Scallop primitives
- **DeepBook (future):** spot orderbook, margin, Predict (options / binary markets) → integrate for liquidity / execution

---

## Idea Shortlist

| # | Idea | Type | What it does | Sponsor angle | Why novel vs 2025 winners |
|---|------|------|--------------|---------------|----------------------------|
| 1 | **YieldRoll Payroll** | Hybrid | Payroll where un-disbursed balance earns yield on Scallop until each employee's payout date; streams via Coindrip-style flows | Scallop (idle float), OZ (role-based access for HR/admin) | Coindrip 2025 was raw streaming; this adds yield + payroll UX layer |
| 2 | **SubPay** (subscriptions) | Payments | Recurring stablecoin subscriptions w/ merchant SDK; pre-funded vault earns yield between charges | Scallop (vault yield), OZ (standardized subscription interface contract) | No 2025 winner tackled recurring billing — huge real-world gap |
| 3 | **InvoiceFi** | DeFi | Tokenize unpaid B2B invoices as NFTs, lenders buy at discount; Scallop pool provides liquidity backstop | Scallop (lending pool), OZ (escrow + dispute pattern) | RWA angle; no 2025 winner did invoice factoring |
| 4 | **SpendVault** (collateral cards) | Hybrid | Deposit SUI/BTC into Scallop, borrow stablecoin against it, spend via QR/virtual-card flow without selling | Scallop (core lending), OZ (liquidation safety, oracle guards) | MizuPay did LBTC→mzUSD; this is *spend* layer, not just mint |
| 5 | **Remit-flo** | Payments | Cross-border remittance: sender pays in stablecoin, recipient auto-swaps to local-pegged token; routed for best FX | OZ (multi-sig fee routing), DeepBook (spot routing later) | No 2025 winner explicitly tackled remittance corridor UX |
| 6 | **DAO Treasury Pro** | Hybrid | Multisig treasury manager with built-in Scallop lending strategies, OZ-style governance, audit-ready reports | OZ (governance + access control patterns), Scallop (treasury yield) | Sui Multisig 2025 was CLI-only; this is treasury+strategy product |
| 7 | **SafeSwap Escrow** | Payments | Milestone-based B2B / freelancer escrow with stealth-address privacy + dispute arbitration | OZ (escrow standards), Scallop (escrowed funds earn yield) | PactDa 2025 was generic contracts; this is freelancer-specific + yield |
| 8 | **CoverScallop** (insurance) | DeFi | Smart-contract cover marketplace; underwriters stake into pools, premiums flow to Scallop for yield | Scallop (deep integration), OZ (premium model, claim verification) | No 2025 winner did onchain insurance — clear gap |
| 9 | **Splitr** (group payments) | Payments | Splitwise-on-Sui: split bills, IOUs settle in stablecoin, optional Scallop float for group savings | OZ (account abstraction patterns), Scallop (group vault yield) | Mass-consumer angle, no equivalent in 2025 |
| 10 | **MerchantPay SDK** | Payments | Drop-in checkout for merchants: accept any Sui token, auto-convert + settle daily, audited contracts | OZ (audited core), DeepBook (auto-conversion later) | No 2025 winner built merchant-side rails |

---

## How to pick

**Highest sponsor leverage (OZ + Scallop both):** 1, 6, 8
**Most "real-world payments" feel (track wording):** 2, 4, 5, 9, 10
**Best moat / hardest for others to copy:** 3 (InvoiceFi), 8 (Insurance)
**Easiest hackathon scope:** 9 (Splitr), 2 (SubPay)
**Best DeepBook fit if added later:** 5, 10, 4

## Open questions before picking
- Solo or team? Affects scope.
- Move-on-Sui experience level? Lending/escrow needs more contract work than UX-heavy ideas.
- Aim for 1st place (OZ-flavored, security-first) or 3rd (Scallop-integrated)?
- Want a B2B / infra play (3, 6, 10) or consumer (4, 5, 9)?
