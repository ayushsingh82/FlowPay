"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, QrCode, Zap, ArrowRight } from "lucide-react";
import { TokenIcon } from "./token-icon";
import {
  type Asset,
  type PtbStep,
  optimizeSpend,
  buildPtbSteps,
  deepEarnedForSpend,
  fmtUsd,
  fmtNum,
  MERCHANT_TOKENS,
  type MerchantToken,
} from "@/lib/flowpay-demo";

interface SmartSpendTabProps {
  assets: Asset[];
  paused: boolean;
  /** commit the spend to the parent store (deduct asset, add DEEP, count spend) */
  onSpend: (symbol: Asset["symbol"], unitsSold: number, notionalUsd: number, deepEarned: number) => void;
}

type Phase = "idle" | "executing" | "done";

const PRESETS = [5, 20, 50];

export function SmartSpendTab({ assets, paused, onSpend }: SmartSpendTabProps) {
  const [amount, setAmount] = useState("5");
  const [merchant, setMerchant] = useState("Brew & Bean Coffee");
  const [token, setToken] = useState<MerchantToken>("USDC");

  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState(-1);

  const notional = Math.max(0, parseFloat(amount) || 0);

  const result = useMemo(
    () => (notional > 0 ? optimizeSpend(assets, notional) : null),
    [assets, notional],
  );

  const deepEarned = deepEarnedForSpend(notional);
  const steps: PtbStep[] = useMemo(
    () => (result ? buildPtbSteps(result.best, token, deepEarned) : []),
    [result, token, deepEarned],
  );

  async function execute() {
    if (!result || !result.best.feasible || paused) return;
    setPhase("executing");
    setActiveStep(0);
    // simulate the atomic PTB executing in ~800ms across 6 steps
    const perStep = 800 / steps.length;
    for (let i = 0; i < steps.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, perStep));
      setActiveStep(i + 1);
    }
    onSpend(result.best.asset.symbol, result.best.unitsSold, notional, deepEarned);
    setPhase("done");
  }

  function reset() {
    setPhase("idle");
    setActiveStep(-1);
  }

  const best = result?.best;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: compose payment */}
      <div className="space-y-5">
        <div className="border border-foreground/10 bg-black rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <QrCode className="w-4 h-4 text-[#CFFF03]" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Scan / enter payment
            </span>
          </div>

          <label className="font-mono text-xs text-muted-foreground">Merchant</label>
          <Input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            disabled={phase !== "idle"}
            className="mt-1 mb-4 bg-input/40 border-foreground/10"
          />

          <label className="font-mono text-xs text-muted-foreground">Amount (USD)</label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={phase !== "idle"}
              className="bg-input/40 border-foreground/10 font-mono text-lg"
            />
            <div className="flex gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  disabled={phase !== "idle"}
                  className="px-2.5 py-1 rounded-md border border-foreground/10 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40"
                >
                  ${p}
                </button>
              ))}
            </div>
          </div>

          <label className="font-mono text-xs text-muted-foreground mt-4 block">
            Merchant receives
          </label>
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {MERCHANT_TOKENS.map((t) => (
              <button
                key={t}
                onClick={() => setToken(t)}
                disabled={phase !== "idle"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border font-mono text-xs transition-colors disabled:opacity-40 ${
                  token === t
                    ? "border-[#CFFF03]/50 bg-[#CFFF03]/10 text-[#CFFF03]"
                    : "border-foreground/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                <TokenIcon symbol={t} size={16} />
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Optimizer verdict */}
        {best && (
          <div className="border border-[#CFFF03]/25 bg-[#CFFF03]/[0.04] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[#CFFF03]" />
              <span className="font-mono text-xs uppercase tracking-wider text-[#CFFF03]">
                SmartSpend optimizer
              </span>
            </div>
            {best.feasible ? (
              <>
                <p className="text-sm text-foreground leading-relaxed">
                  Selling{" "}
                  <span className="font-mono text-[#CFFF03]">
                    {fmtNum(best.unitsSold, 6)} {best.asset.symbol}
                  </span>{" "}
                  via DeepBook
                  {result && result.savings > 0 && best.asset.symbol !== result.naive.asset.symbol ? (
                    <>
                      {" "}
                      <span className="text-emerald-400 font-mono">
                        (saves {fmtUsd(result.savings, 4)} vs selling {result.naive.asset.symbol})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground"> · cheapest execution</span>
                  )}
                  .
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
                  <Cost label="Spread" v={best.spreadCost} />
                  <Cost label="Impact" v={best.impactCost} />
                  <Cost label="Lost yield" v={best.yieldCost} />
                </div>
                <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                  All-in cost {fmtUsd(best.totalCost, 4)} · {best.bps.toFixed(1)} bps
                </div>
              </>
            ) : (
              <p className="text-sm text-destructive">
                No single holding can cover {fmtUsd(notional)}. Top up the basket.
              </p>
            )}
          </div>
        )}

        {phase === "idle" && (
          <Button
            onClick={execute}
            disabled={!best?.feasible || paused || notional <= 0}
            className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium"
          >
            {paused ? "Paused by safety guard" : `Pay ${fmtUsd(notional)}`}
            {!paused && <ArrowRight className="w-4 h-4" />}
          </Button>
        )}
        {phase === "done" && (
          <Button
            onClick={reset}
            variant="outline"
            className="w-full h-12 rounded-full border-foreground/20"
          >
            New payment
          </Button>
        )}
      </div>

      {/* Right: atomic PTB execution */}
      <div className="border border-foreground/10 bg-black rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Atomic PTB · simulated
          </span>
          {phase === "executing" && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-[#CFFF03]">
              <Loader2 className="w-3 h-3 animate-spin" /> executing…
            </span>
          )}
          {phase === "done" && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-emerald-400">
              <Check className="w-3 h-3" /> settled · ~800ms
            </span>
          )}
        </div>

        <ol className="space-y-3">
          {steps.map((step, i) => {
            const state =
              phase === "idle"
                ? "pending"
                : i < activeStep
                  ? "done"
                  : i === activeStep
                    ? "active"
                    : "pending";
            return (
              <li key={step.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono transition-colors ${
                    state === "done"
                      ? "bg-emerald-400/15 text-emerald-400"
                      : state === "active"
                        ? "bg-[#CFFF03]/15 text-[#CFFF03]"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {state === "done" ? (
                    <Check className="w-3 h-3" />
                  ) : state === "active" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${state === "pending" ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      {step.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      {step.module}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{step.detail}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {phase === "done" && best && (
          <div className="mt-5 border-t border-foreground/10 pt-4 space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="text-foreground">
                {fmtUsd(notional)} {token} → {merchant}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sold</span>
              <span className="text-foreground">
                {fmtNum(best.unitsSold, 6)} {best.asset.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DEEP cashback</span>
              <span className="text-emerald-400">+{deepEarned.toFixed(3)} DEEP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Yield</span>
              <span className="text-emerald-400">still ticking ✓</span>
            </div>
          </div>
        )}

        {phase === "idle" && (
          <p className="mt-5 font-mono text-[11px] text-muted-foreground/60 leading-relaxed">
            Withdraw → route → guard → settle → cashback → emit, all in one Sui PTB. If any step
            fails, the whole transaction reverts.
          </p>
        )}
      </div>
    </div>
  );
}

function Cost({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-md border border-foreground/10 bg-black/40 px-2 py-1.5">
      <div className="text-muted-foreground/70">{label}</div>
      <div className="text-foreground">{fmtUsd(v, 4)}</div>
    </div>
  );
}
