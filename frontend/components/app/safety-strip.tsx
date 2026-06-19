"use client";

import { ShieldCheck, ShieldAlert, Activity, Lock } from "lucide-react";
import type { Asset, SafetyState } from "@/lib/flowpay-demo";

interface SafetyStripProps {
  safety: SafetyState;
  assets: Asset[];
  onTogglePause: () => void;
}

/** OZ emergency pause + Pyth oracle freshness + per-asset LTV caps. */
export function SafetyStrip({ safety, assets, onTogglePause }: SafetyStripProps) {
  const oracleFresh = safety.oracleAgeSec <= safety.oracleMaxAgeSec;

  return (
    <div className="border border-foreground/10 bg-black/40 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-mono">
      <span className="text-muted-foreground/70 uppercase tracking-wider">Safety</span>

      {/* Emergency pause (OZ pattern) */}
      <button
        onClick={onTogglePause}
        className="flex items-center gap-2 group"
        title="OpenZeppelin-pattern emergency pause"
      >
        {safety.paused ? (
          <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className={safety.paused ? "text-destructive" : "text-foreground/80"}>
          {safety.paused ? "PAUSED" : "OZ pause: armed"}
        </span>
        <span className="text-muted-foreground/50 group-hover:text-foreground/60 transition-colors">
          (tap)
        </span>
      </button>

      {/* Pyth oracle freshness */}
      <span className="flex items-center gap-2">
        <Activity className={`w-3.5 h-3.5 ${oracleFresh ? "text-emerald-400" : "text-amber-400"}`} />
        <span className="text-foreground/80">
          Pyth {oracleFresh ? "fresh" : "stale"} · {safety.oracleAgeSec.toFixed(1)}s
        </span>
        <span className="text-muted-foreground/50">/ {safety.oracleMaxAgeSec}s max</span>
      </span>

      {/* Per-asset LTV caps */}
      <span className="flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-foreground/60" />
        <span className="text-muted-foreground/70">LTV caps</span>
        {assets.map((a) => (
          <span key={a.symbol} className="text-foreground/80">
            {a.symbol} {(a.ltvCap * 100).toFixed(0)}%
          </span>
        ))}
      </span>
    </div>
  );
}
