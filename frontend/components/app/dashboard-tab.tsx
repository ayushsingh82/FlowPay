"use client";

import {
  type Asset,
  assetUsdValue,
  totalUsdValue,
  blendedApy,
  fmtUsd,
  fmtNum,
} from "@/lib/flowpay-demo";
import { AnimatedNumber } from "./animated-number";
import { TokenIcon } from "./token-icon";

interface DashboardTabProps {
  assets: Asset[];
  /** total yield accrued live since the demo opened, in USD */
  accruedYield: number;
}

export function DashboardTab({ assets, accruedYield }: DashboardTabProps) {
  const total = totalUsdValue(assets);
  const apy = blendedApy(assets);
  const dailyYield = (total * apy) / 365;

  return (
    <div className="space-y-6">
      {/* Hero balance */}
      <div className="border border-foreground/10 bg-black rounded-xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#CFFF03]/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Total balance · earning on Scallop
          </span>
          <div className="mt-2 flex items-end gap-3 flex-wrap">
            <AnimatedNumber
              value={total}
              format={(n) => fmtUsd(n)}
              className="text-5xl lg:text-6xl font-display text-foreground leading-none"
            />
            <span className="text-sm font-mono text-emerald-400 mb-1.5">
              +{(apy * 100).toFixed(2)}% APY blended
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <div className="font-mono text-xs text-muted-foreground">Yield accrued (live)</div>
              <AnimatedNumber
                value={accruedYield}
                duration={300}
                format={(n) => "+" + n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 6, maximumFractionDigits: 6 })}
                className="text-lg font-mono text-emerald-400"
              />
            </div>
            <div>
              <div className="font-mono text-xs text-muted-foreground">Projected / day</div>
              <div className="text-lg font-mono text-foreground/80">{fmtUsd(dailyYield, 4)}</div>
            </div>
            <div>
              <div className="font-mono text-xs text-muted-foreground">Assets</div>
              <div className="text-lg font-mono text-foreground/80">{assets.length} pools</div>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
        {assets.map((a) => {
          const pct = total > 0 ? (assetUsdValue(a) / total) * 100 : 0;
          return (
            <div
              key={a.symbol}
              style={{ width: `${pct}%`, backgroundColor: a.color }}
              className="h-full transition-all duration-700"
              title={`${a.symbol} ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Asset rows */}
      <div className="border border-foreground/10 rounded-xl divide-y divide-foreground/10 overflow-hidden">
        {assets.map((a) => {
          const value = assetUsdValue(a);
          const assetDaily = (value * a.apy) / 365;
          return (
            <div
              key={a.symbol}
              className="flex items-center gap-4 px-5 py-4 hover:bg-foreground/[0.02] transition-colors"
            >
              <span className="shrink-0">
                <TokenIcon symbol={a.symbol} size={36} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{a.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">{a.name}</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {fmtNum(a.amount, 6)} {a.symbol} · {fmtUsd(a.price, a.price < 10 ? 4 : 0)}
                </div>
              </div>
              <div className="text-right">
                <AnimatedNumber
                  value={value}
                  format={(n) => fmtUsd(n)}
                  className="block font-mono text-foreground"
                />
                <span className="font-mono text-xs text-emerald-400">
                  {(a.apy * 100).toFixed(2)}% · +{fmtUsd(assetDaily, 4)}/d
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="font-mono text-[11px] text-muted-foreground/60 leading-relaxed">
        Idle balance auto-deposits into per-asset Scallop pools; sCoins back the vault accounting.
        Yield ticks here in real time and keeps accruing even while you spend.
      </p>
    </div>
  );
}
