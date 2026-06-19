"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Gift, Sparkles } from "lucide-react";
import { AnimatedNumber } from "./animated-number";
import {
  DEEP_PRICE,
  CASHBACK_RATE,
  feeDiscountForStake,
  fmtUsd,
} from "@/lib/flowpay-demo";

interface CashbackTabProps {
  deepBalance: number;
  spendCount: number;
  staked: number;
  onStake: (amount: number) => void;
}

/** DEEP cashback — growing balance from spends + stake-for-discount control. */
export function CashbackTab({ deepBalance, spendCount, staked, onStake }: CashbackTabProps) {
  const available = Math.max(0, deepBalance - staked);
  const [stakeTarget, setStakeTarget] = useState(staked);

  useEffect(() => {
    setStakeTarget(staked);
  }, [staked]);

  const discount = feeDiscountForStake(stakeTarget);
  const maxStake = Math.max(1, Math.ceil(deepBalance));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="border border-foreground/10 bg-black rounded-xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#BE185D]/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4 text-[#BE185D]" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              DEEP cashback
            </span>
          </div>

          <span className="font-mono text-xs text-muted-foreground">Total DEEP earned</span>
          <div className="flex items-end gap-2">
            <AnimatedNumber
              value={deepBalance}
              format={(n) => n.toFixed(3)}
              className="text-5xl font-display text-foreground leading-none"
            />
            <span className="text-sm font-mono text-muted-foreground mb-1">DEEP</span>
          </div>
          <div className="mt-1 font-mono text-xs text-emerald-400">
            ≈ {fmtUsd(deepBalance * DEEP_PRICE, 2)} · {(CASHBACK_RATE * 100).toFixed(1)}% back per spend
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-xs">
            <Stat label="Spends rewarded" value={String(spendCount)} />
            <Stat label="Staked" value={`${staked.toFixed(2)} DEEP`} />
            <Stat label="Available" value={`${available.toFixed(2)} DEEP`} />
            <Stat label="DEEP price" value={fmtUsd(DEEP_PRICE, 3)} />
          </div>

          <p className="mt-5 font-mono text-[11px] text-muted-foreground/60 leading-relaxed">
            Every SmartSpend mints DEEP via DeepBook&apos;s loyalty hooks — a self-reinforcing
            flywheel that grows the DeepBook user base.
          </p>
        </div>
      </div>

      <div className="border border-foreground/10 bg-black rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#BE185D]" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Stake for fee discount
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="font-mono text-xs text-muted-foreground">Stake amount</span>
          <span className="text-2xl font-display text-foreground">{stakeTarget.toFixed(1)} DEEP</span>
        </div>
        <Slider
          value={[stakeTarget]}
          min={0}
          max={maxStake}
          step={maxStake / 100}
          onValueChange={(v) => setStakeTarget(v[0])}
          className="mt-3"
        />

        <div className="mt-6">
          <div className="flex items-center justify-between font-mono text-xs mb-2">
            <span className="text-muted-foreground">Spend fee discount</span>
            <span className="text-[#BE185D] text-base">{(discount * 100).toFixed(1)}%</span>
          </div>
          <Progress value={(discount / 0.3) * 100} className="bg-secondary [&>*]:bg-[#BE185D]" />
          <div className="mt-1 font-mono text-[11px] text-muted-foreground/60">
            up to 30% off DeepBook execution fees on future spends
          </div>
        </div>

        <Button
          onClick={() => onStake(stakeTarget)}
          disabled={stakeTarget === staked}
          className="mt-6 w-full h-11 rounded-full bg-foreground text-background hover:bg-foreground/90"
        >
          {stakeTarget > staked
            ? `Stake ${(stakeTarget - staked).toFixed(2)} DEEP`
            : stakeTarget < staked
              ? `Unstake to ${stakeTarget.toFixed(2)} DEEP`
              : "Adjust stake"}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-foreground/10 bg-black/40 px-3 py-2">
      <div className="text-muted-foreground/70">{label}</div>
      <div className="text-foreground mt-0.5">{value}</div>
    </div>
  );
}
