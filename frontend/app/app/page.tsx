"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Wallet, Zap, Sprout, CalendarClock, Clock, Gift, Menu, X } from "lucide-react";
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
import { WalletStatus } from "@/components/app/wallet-status";
import { useScallopApy } from "@/hooks/use-scallop-apy";
import { SafetyStrip } from "@/components/app/safety-strip";
import { DashboardTab } from "@/components/app/dashboard-tab";
import { SmartSpendTab } from "@/components/app/smartspend-tab";
import { DeepBookSwap } from "@/components/app/deepbook-swap";
import { ScallopDeposit } from "@/components/app/scallop-deposit";
import { BillsTab } from "@/components/app/bills-tab";
import { MarginTab } from "@/components/app/margin-tab";
import { CashbackTab } from "@/components/app/cashback-tab";

type TabValue = "dashboard" | "smartspend" | "earn" | "bills" | "margin" | "cashback";

const NAV_ITEMS = [
  { value: "dashboard" as TabValue, label: "Dashboard", icon: Wallet },
  { value: "smartspend" as TabValue, label: "SmartSpend", icon: Zap },
  { value: "earn" as TabValue, label: "Earn", icon: Sprout },
  { value: "bills" as TabValue, label: "Lock Rate", icon: CalendarClock },
  { value: "margin" as TabValue, label: "Spend Tomorrow", icon: Clock },
  { value: "cashback" as TabValue, label: "DEEP Cashback", icon: Gift },
];

const SECTION_TITLES: Record<TabValue, string> = {
  dashboard: "Dashboard",
  smartspend: "SmartSpend",
  earn: "Earn",
  bills: "Lock Rate",
  margin: "Spend Tomorrow",
  cashback: "DEEP Cashback",
};

export default function AppDemoPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Real Scallop mainnet supply APYs — replaces the seeded apy numbers so the
  // dashboard's yields (and the live ticker derived from them) are real.
  const scallop = useScallopApy();
  useEffect(() => {
    if (!scallop.live) return;
    setAssets((prev) =>
      prev.map((a) =>
        scallop.rates[a.symbol] != null ? { ...a, apy: scallop.rates[a.symbol]! } : a,
      ),
    );
  }, [scallop.live, scallop.rates]);

  const assetsRef = useRef(assets);
  assetsRef.current = assets;
  useEffect(() => {
    const interval = setInterval(() => {
      const total = totalUsdValue(assetsRef.current);
      const apy = blendedApy(assetsRef.current);
      const perTick = ((total * apy) / (365 * 24 * 3600)) * 5000;
      setAccruedYield((y) => y + perTick);
      setSafety((s) => ({ ...s, oracleAgeSec: 0.2 + Math.random() * 2.6 }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  function navigate(tab: TabValue) {
    setActiveTab(tab);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground noise-overlay flex">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-foreground/10 sticky top-0 h-screen z-30">
        <div className="h-16 flex items-center px-5 border-b border-foreground/10">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="FlowPay" width={28} height={28} className="w-7 h-7" />
            <span className="font-display text-xl tracking-tight">
              Flow<span className="text-[#CFFF03]">Pay</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 px-3 pt-3 pb-2">
            App
          </p>
          {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => navigate(value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all ${
                activeTab === value
                  ? "bg-[#CFFF03]/10 text-[#CFFF03] font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {activeTab === value && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#CFFF03]" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-foreground/10 space-y-3">
          <DemoBadge />
          <p className="font-mono text-[10px] text-muted-foreground/40 leading-relaxed">
            Testnet demo · no real funds
          </p>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-[260px] flex flex-col bg-background border-r border-foreground/10 h-full z-10">
            <div className="h-16 flex items-center justify-between px-5 border-b border-foreground/10">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
                <Image src="/logo.svg" alt="FlowPay" width={28} height={28} className="w-7 h-7" />
                <span className="font-display text-xl tracking-tight">
                  Flow<span className="text-[#CFFF03]">Pay</span>
                </span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => navigate(value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all ${
                    activeTab === value
                      ? "bg-[#CFFF03]/10 text-[#CFFF03] font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-foreground/10">
              <DemoBadge />
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-foreground/10 bg-background/80 backdrop-blur-xl flex items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Mobile logo (hidden on desktop since sidebar has it) */}
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <Image src="/logo.svg" alt="FlowPay" width={24} height={24} className="w-6 h-6" />
              <span className="font-display text-lg tracking-tight">
                Flow<span className="text-[#CFFF03]">Pay</span>
              </span>
            </Link>
            <span className="hidden lg:block font-display text-lg text-foreground">
              {SECTION_TITLES[activeTab]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:block">
              <DemoBadge />
            </span>
            <WalletStatus />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto p-5 lg:p-8 space-y-6">
          <SafetyStrip safety={safety} assets={assets} onTogglePause={togglePause} />

          {activeTab === "dashboard" && (
            <DashboardTab
              assets={assets}
              accruedYield={accruedYield}
              apyLive={scallop.live}
              apyUpdatedAt={scallop.updatedAt}
            />
          )}
          {activeTab === "smartspend" && (
            <div className="space-y-6">
              <DeepBookSwap />
              <div className="border-t border-foreground/10 pt-6">
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/50 mb-4">
                  Simulated routing preview
                </p>
                <SmartSpendTab assets={assets} paused={safety.paused} onSpend={handleSpend} />
              </div>
            </div>
          )}
          {activeTab === "earn" && (
            <div className="max-w-xl">
              <ScallopDeposit />
            </div>
          )}
          {activeTab === "bills" && (
            <BillsTab bills={bills} onLock={handleLockBill} />
          )}
          {activeTab === "margin" && (
            <MarginTab assets={assets} />
          )}
          {activeTab === "cashback" && (
            <CashbackTab
              deepBalance={deepBalance}
              spendCount={spendCount}
              staked={staked}
              onStake={handleStake}
            />
          )}

          <footer className="pt-2 pb-6 text-center">
            <p className="font-mono text-[11px] text-muted-foreground/40 leading-relaxed max-w-xl mx-auto">
              Live wallet connect, testnet balances &amp; a real on-chain DeepBook swap (SmartSpend tab) · yield, cashback &amp; the routing preview are simulated · Sui Overflow 2026
            </p>
          </footer>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden sticky bottom-0 border-t border-foreground/10 bg-background/95 backdrop-blur-xl flex">
          {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-mono transition-colors ${
                activeTab === value ? "text-[#CFFF03]" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="leading-none">{label.split(" ")[0]}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
