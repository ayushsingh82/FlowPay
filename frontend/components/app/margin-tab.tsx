"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Check, Clock, Loader2 } from "lucide-react";
import {
  type Asset,
  type AssetSymbol,
  planMargin,
  assetUsdValue,
  fmtUsd,
  fmtNum,
} from "@/lib/flowpay-demo";

interface MarginTabProps {
  assets: Asset[];
}

/** Spend Tomorrow — DeepBook Margin BNPL without selling the bag. */
export function MarginTab({ assets }: MarginTabProps) {
  const [liquidity, setLiquidity] = useState(200);
  const [collateral, setCollateral] = useState<AssetSymbol>("BTC");
  const [phase, setPhase] = useState<"idle" | "opening" | "done">("idle");

  const collateralAsset = assets.find((a) => a.symbol === collateral) ?? assets[0];
  const maxLiquidity = Math.floor(assetUsdValue(collateralAsset) * collateralAsset.ltvCap);

  const plan = useMemo(
    () => planMargin(assets, liquidity, collateral),
    [assets, liquidity, collateral],
  );

  const overCap = plan.ltvUsed > collateralAsset.ltvCap;

  async function open() {
    if (overCap) return;
    setPhase("opening");
    await new Promise((r) => setTimeout(r, 850));
    setPhase("done");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="border border-foreground/10 bg-black rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#BE185D]" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Spend tomorrow · DeepBook Margin
          </span>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs text-muted-foreground">Liquidity now (USDC)</span>
            <span className="text-2xl font-display text-foreground">{fmtUsd(liquidity, 0)}</span>
          </div>
          <Slider
            value={[liquidity]}
            min={50}
            max={Math.max(50, maxLiquidity)}
            step={10}
            onValueChange={(v) => {
              setLiquidity(v[0]);
              setPhase("idle");
            }}
            disabled={phase !== "idle"}
            className="mt-3"
          />
          <div className="mt-1 font-mono text-[11px] text-muted-foreground/60">
            max {fmtUsd(maxLiquidity, 0)} at {(collateralAsset.ltvCap * 100).toFixed(0)}% LTV
          </div>
        </div>

        <div>
          <span className="font-mono text-xs text-muted-foreground">Keep as collateral (don&apos;t sell)</span>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {assets.map((a) => (
              <button
                key={a.symbol}
                onClick={() => {
                  setCollateral(a.symbol);
                  setPhase("idle");
                }}
                disabled={phase !== "idle"}
                className={`px-3 py-1.5 rounded-md border font-mono text-xs transition-colors disabled:opacity-40 ${
                  collateral === a.symbol
                    ? "border-[#BE185D]/50 bg-[#BE185D]/10 text-[#BE185D]"
                    : "border-foreground/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                {a.symbol}
              </button>
            ))}
          </div>
        </div>

        {phase === "idle" && (
          <Button
            onClick={open}
            disabled={overCap}
            className="w-full h-11 rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {overCap ? "Exceeds LTV cap" : `Get ${fmtUsd(liquidity, 0)} now`}
          </Button>
        )}
        {phase === "opening" && (
          <Button disabled className="w-full h-11 rounded-full gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Opening short on DeepBook Margin…
          </Button>
        )}
        {phase === "done" && (
          <Button
            onClick={() => setPhase("idle")}
            variant="outline"
            className="w-full h-11 rounded-full border-foreground/20"
          >
            Done — new request
          </Button>
        )}
      </div>

      <div className="border border-foreground/10 bg-black rounded-xl p-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Position preview
        </span>

        <div className="mt-4 space-y-2.5 font-mono text-sm">
          <Row label="Liquidity received" value={`${fmtUsd(plan.liquidityUsd, 0)} USDC`} />
          <Row label="Collateral kept" value={`${fmtNum(collateralAsset.amount, 6)} ${collateral}`} />
          <Row
            label="Short opened"
            value={`${fmtNum(plan.shortSize, 6)} ${collateral}`}
          />
          <Row
            label="LTV used"
            value={`${(plan.ltvUsed * 100).toFixed(1)}% / ${(collateralAsset.ltvCap * 100).toFixed(0)}% cap`}
            danger={overCap}
          />
          <Row label="Funding fee" value={`${fmtUsd(plan.weeklyFee, 2)} / week`} />
        </div>

        <div className="mt-5 rounded-lg border border-foreground/10 bg-black/40 p-4">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Check className="w-3.5 h-3.5" /> Auto-repay armed
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Your {collateral} keeps earning on Scallop and is never sold. The short auto-closes from
            your next incoming payment (e.g. salary), so you never manage the position.
          </p>
        </div>

        {phase === "done" && (
          <div className="mt-4 flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Check className="w-3.5 h-3.5" /> {fmtUsd(plan.liquidityUsd, 0)} USDC delivered · LTV
            within BorrowGuard caps
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={danger ? "text-destructive" : "text-foreground"}>{value}</span>
    </div>
  );
}
