"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Lock, Check, TrendingUp } from "lucide-react";
import { type Bill, fmtUsd } from "@/lib/flowpay-demo";

interface BillsTabProps {
  bills: Bill[];
  onLock: (id: string) => void;
}

/** Lock Rate — DeepBook Predict binary options to hedge upcoming FX bills. */
export function BillsTab({ bills, onLock }: BillsTabProps) {
  const [locking, setLocking] = useState<string | null>(null);

  async function lock(id: string) {
    setLocking(id);
    await new Promise((r) => setTimeout(r, 700));
    onLock(id);
    setLocking(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-[#CFFF03]" />
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Upcoming bills · DeepBook Predict
        </span>
      </div>

      {bills.map((bill) => (
        <div key={bill.id} className="border border-foreground/10 bg-black rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg text-foreground">{bill.label}</span>
                <Badge variant="outline" className="border-foreground/15 font-mono text-[10px]">
                  due in {bill.dueInDays}d
                </Badge>
              </div>
              <div className="mt-1 font-mono text-sm text-muted-foreground">
                {bill.localAmount.toLocaleString()} {bill.localCcy} · {fmtUsd(bill.usdToday)} @{" "}
                {bill.rate} {bill.localCcy}/USD today
              </div>
            </div>
            {bill.locked ? (
              <Badge className="bg-emerald-400/15 text-emerald-400 border-transparent font-mono text-xs gap-1">
                <Check className="w-3 h-3" /> Rate locked
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-400/30 text-amber-400 font-mono text-xs gap-1">
                <TrendingUp className="w-3 h-3" /> FX exposed
              </Badge>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-foreground/10 bg-black/40 p-4">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1">
              Suggested hedge
            </div>
            <div className="font-mono text-sm text-foreground">{bill.predictMarket}</div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              One tap opens a binary on DeepBook Predict that pays out if the rate moves against you —
              locking your effective cost at {fmtUsd(bill.usdToday)} regardless of FX drift.
            </p>
          </div>

          {!bill.locked && (
            <Button
              onClick={() => lock(bill.id)}
              disabled={locking === bill.id}
              className="mt-4 w-full h-11 rounded-full bg-foreground text-background hover:bg-foreground/90 gap-2"
            >
              <Lock className="w-4 h-4" />
              {locking === bill.id ? "Locking on DeepBook Predict…" : "Lock today's rate"}
            </Button>
          )}
        </div>
      ))}

      <p className="font-mono text-[11px] text-muted-foreground/60 leading-relaxed">
        First consumer-facing use of DeepBook Predict inside a payment app — hedge a bill the way you
        send money.
      </p>
    </div>
  );
}
