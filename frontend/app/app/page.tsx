"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Wallet, Zap, CalendarClock, Clock, Gift } from "lucide-react";
import {
  SEED_ASSETS,
  SEED_BILLS,
  type Asset,
  type Bill,
  type SafetyState,
  totalUsdValue,
  blendedApy,
} from "@/lib/flowpay-demo";
import { DemoBadge } from "@/components/app/demo-badge";
import { SafetyStrip } from "@/components/app/safety-strip";
import { DashboardTab } from "@/components/app/dashboard-tab";
import { SmartSpendTab } from "@/components/app/smartspend-tab";
import { BillsTab } from "@/components/app/bills-tab";
import { MarginTab } from "@/components/app/margin-tab";
import { CashbackTab } from "@/components/app/cashback-tab";

const TABS = [
  { value: "dashboard", label: "Dashboard", icon: Wallet },
  { value: "smartspend", label: "SmartSpend", icon: Zap },
  { value: "bills", label: "Lock Rate", icon: CalendarClock },
  { value: "margin", label: "Spend Tomorrow", icon: Clock },
  { value: "cashback", label: "DEEP Cashback", icon: Gift },
] as const;

export default function AppDemoPage() {
  // ---- central demo store (all client-side, seeded) ----
  const [assets, setAssets] = useState<Asset[]>(() => SEED_ASSETS.map((a) => ({ ...a })));
  const [bills, setBills] = useState<Bill[]>(() => SEED_BILLS.map((b) => ({ ...b })));
  const [accruedYield, setAccruedYield] = useState(0);
  const [deepBalance, setDeepBalance] = useState(2.418);
  const [spendCount, setSpendCount] = useState(3);
  const [staked, setStaked] = useState(0);
  const [safety, setSafety] = useState<SafetyState>({
    paused: false,
    oracleAgeSec: 0.4,
    oracleMaxAgeSec: 30,
  });

  // ---- live yield ticker: accrue blended APY in real time ----
  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  useEffect(() => {
    const interval = setInterval(() => {
      const total = totalUsdValue(assetsRef.current);
      const apy = blendedApy(assetsRef.current);
      // 1 second of yield, scaled up 5000x so the demo visibly moves
      const perTick = ((total * apy) / (365 * 24 * 3600)) * 5000;
      setAccruedYield((y) => y + perTick);
      // oracle "freshness" jitters between 0.2s and ~3s
      setSafety((s) => ({ ...s, oracleAgeSec: 0.2 + Math.random() * 2.6 }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---- actions ----
  function handleSpend(symbol: Asset["symbol"], unitsSold: number, _notional: number, deepEarned: number) {
    setAssets((prev) =>
      prev.map((a) => (a.symbol === symbol ? { ...a, amount: Math.max(0, a.amount - unitsSold) } : a)),
    );
    setDeepBalance((d) => d + deepEarned);
    setSpendCount((c) => c + 1);
  }

  function handleLockBill(id: string) {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, locked: true } : b)));
  }

  function handleStake(amount: number) {
    setStaked(Math.min(amount, deepBalance));
  }

  function togglePause() {
    setSafety((s) => ({ ...s, paused: !s.paused }));
  }

  return (
    <main className="min-h-screen bg-background text-foreground noise-overlay">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-mono shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="h-5 w-px bg-foreground/10" />
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.svg" alt="FlowPay" width={24} height={24} className="w-6 h-6" />
              <span className="font-display text-xl tracking-tight">
                Flow<span className="text-[#CFFF03]">Pay</span>
              </span>
            </Link>
          </div>
          <DemoBadge />
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-8 space-y-6">
        {/* Safety strip */}
        <SafetyStrip safety={safety} assets={assets} onTogglePause={togglePause} />

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="gap-6">
          <div className="overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0">
            <TabsList className="bg-secondary/60 h-auto p-1 w-max lg:w-full">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="data-[state=active]:bg-background data-[state=active]:text-foreground px-3.5 py-2 gap-2 font-mono text-xs"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <DashboardTab assets={assets} accruedYield={accruedYield} />
          </TabsContent>
          <TabsContent value="smartspend">
            <SmartSpendTab assets={assets} paused={safety.paused} onSpend={handleSpend} />
          </TabsContent>
          <TabsContent value="bills">
            <BillsTab bills={bills} onLock={handleLockBill} />
          </TabsContent>
          <TabsContent value="margin">
            <MarginTab assets={assets} />
          </TabsContent>
          <TabsContent value="cashback">
            <CashbackTab
              deepBalance={deepBalance}
              spendCount={spendCount}
              staked={staked}
              onStake={handleStake}
            />
          </TabsContent>
        </Tabs>

        <footer className="pt-4 pb-8 text-center">
          <p className="font-mono text-[11px] text-muted-foreground/50 leading-relaxed max-w-xl mx-auto">
            This is a simulated walkthrough — no real wallet, chain, or funds are involved. Balances,
            APYs, prices, and execution latency are seeded mock data to demonstrate the FlowPay
            product flow for Sui Overflow 2026.
          </p>
        </footer>
      </div>
    </main>
  );
}
