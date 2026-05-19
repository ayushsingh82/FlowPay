# DeepBook Integration Options for FlowPay

Reference list of concrete ways DeepBook can be integrated into FlowPay (or any consumer payment app on Sui). Use this to decide how deep to go on DeepBook.

---

## All Integration Options

| # | Feature | DeepBook primitive | What it does | Makes DeepBook central? |
|---|---------|--------------------|--------------| ------------------------ |
| 1 | **Multi-token wallet by default** | Spot | Users hold basket (SUI/USDC/BTC/ETH); every send needs routing | ✅ Yes — fires on every tx |
| 2 | **SmartSpend** (app picks which token to sell) | Spot | App auto-picks lowest-cost token based on DeepBook liquidity + spreads | ✅ Yes |
| 3 | **Lock Rate** (FX hedge for upcoming bills) | Predict | "I owe ₹40k rent next month" → buy USD/INR binary → rate locked | ✅ Yes — unique use case |
| 4 | **Spend Tomorrow** (BNPL without selling) | Margin | Open short margin position to get spending liquidity; repay next paycheck | ✅ Yes |
| 5 | **Limit Pay** (conditional sends) | Spot orders | "Send $100 to Alice when SUI hits $5" — limit order tied to payment | 🟡 Niche |
| 6 | **Budget Shield** (insure spending budgets) | Predict | Hedge against price spikes on recurring categories (gas, groceries) | 🟡 Niche |
| 7 | **DEEP Cashback** | DEEP token | Earn DEEP on every spend; stake for fee discounts | ✅ Yes — flywheel |
| 8 | **Slippage Shield** (large sends) | Spot deep liquidity | Auto-route large payments through orderbook to avoid AMM slippage | 🟡 Background feature |
| 9 | **Recurring Conversion** (subscriptions) | Spot | Monthly Netflix in USDC, user holds SUI → auto-convert + pay via DeepBook every period | ✅ Yes |
| 10 | **Group Vault Trading** (family/friends) | Spot | Shared vaults can execute DeepBook trades collectively | 🟡 Niche |
| 11 | **Anti-Slippage Refund** | Spot | If DeepBook price improves between order + fill, refund difference to user | 🟢 Differentiator |
| 12 | **Liquidation Auction Participation** | Spot | Users with idle vault funds can bid on Scallop liquidation auctions via DeepBook | 🟡 Power-user |

---

## Best Combos (ranked by sponsor impact)

### Combo A: "DeepBook on every tx" — Maximum integration
- **#1 Multi-token wallet** + **#2 SmartSpend** + **#3 Lock Rate** + **#4 Spend Tomorrow** + **#7 DEEP Cashback**
- **4 DeepBook surfaces used** (Spot + Predict + Margin + DEEP)
- Strongest possible DeepBook sponsor signal
- Dual-eligible for DeFi & Payments core prize + DeepBook specialized $70K pool

### Combo B: "DeepBook as routing engine" — Balanced
- **#1 Multi-token wallet** + **#2 SmartSpend** + **#7 DEEP Cashback**
- 2 DeepBook surfaces (Spot + DEEP token)
- Cleaner scope, still makes DeepBook central
- Predict/Margin can be added in v2

### Combo C: "DeepBook as the moat" — Most novel
- **#3 Lock Rate (Predict)** + **#4 Spend Tomorrow (Margin)** + **#11 Anti-Slippage Refund**
- Focuses on uses no one else is doing yet
- Lower volume of DeepBook calls but more memorable demo moments
- Best for "judges will remember this" angle

---

## Decision Criteria

**Pick more options if:**
- You want to dual-submit (DeFi & Payments + DeepBook specialized)
- You have a 3-4 person team
- You want maximum prize stacking

**Pick fewer options if:**
- Solo or 2-person team
- Want to ship polish over breadth
- Prefer one killer feature over 4 decent ones

---

## To Decide Later
- [ ] Which combo (A, B, or C)?
- [ ] Solo or team size?
- [ ] Dual-submit to DeepBook specialized track? (yes by default if Combo A)
- [ ] Which features are must-have vs nice-to-have for hackathon scope?
