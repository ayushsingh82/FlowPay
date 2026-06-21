"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ConnectModal } from "@mysten/dapp-kit";
import { TrendingUp, Zap, Shield } from "lucide-react";

const PERKS = [
  {
    icon: TrendingUp,
    title: "Auto-earn on Scallop",
    desc: "Every idle asset earns yield the moment it lands in your vault.",
  },
  {
    icon: Zap,
    title: "Spend via DeepBook",
    desc: "Best-price execution on every payment — routed through the CLOB.",
  },
  {
    icon: Shield,
    title: "Atomic in one PTB",
    desc: "Borrow, swap, send — one transaction. No partial states, ever.",
  },
];

export function WalletGate() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#CFFF03]/5 blur-[120px] pointer-events-none" />

      {/* top-left logo */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="FlowPay" width={28} height={28} />
          <span className="font-display text-xl text-white tracking-tight">
            Flow<span className="text-[#CFFF03]">Pay</span>
          </span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        {/* icon */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-[#CFFF03]/10 border border-[#CFFF03]/20 flex items-center justify-center">
          <Image src="/logo.svg" alt="" width={32} height={32} />
        </div>

        <h1 className="font-display text-3xl text-white mb-2">Connect your wallet</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-8">
          Use Slush or any Sui wallet to access your FlowPay vault on testnet.
        </p>

        {/* perks */}
        <div className="space-y-3 mb-8 text-left">
          {PERKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3">
              <div className="mt-0.5 w-7 h-7 rounded-lg bg-[#CFFF03]/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#CFFF03]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-white/40 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <ConnectModal
          trigger={
            <button className="w-full bg-[#CFFF03] hover:bg-[#CFFF03]/90 active:scale-[0.98] text-black font-semibold py-3 rounded-xl text-sm transition-all">
              Connect Sui Wallet
            </button>
          }
          open={open}
          onOpenChange={setOpen}
        />

        <p className="mt-4 text-xs text-white/25 font-mono">
          Sui Testnet · no real funds · Sui Overflow 2026
        </p>
      </div>
    </div>
  );
}
