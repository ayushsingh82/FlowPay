import Link from "next/link";
import { Callout } from "./_components/shared";

export default function DocsIntroPage() {
  return (
    <>
      <div className="mb-2">
        <span className="text-xs font-mono text-white/25 uppercase tracking-widest">Overview</span>
      </div>
      <h1 className="text-5xl lg:text-[56px] font-display tracking-tight leading-[0.92] mb-8 text-white">
        What is <span className="text-[#B6E324]">Vela</span>?
      </h1>

      <p className="text-white/55 leading-relaxed mb-4 text-lg">
        <span className="text-[#B6E324]">Vela</span> is a stock-collateralized credit
        protocol built on Robinhood Chain. You deposit tokenized equities — TSLA, AMZN,
        AMD, PLTR, NFLX — and borrow USDG against them without selling a share.
      </p>
      <p className="text-white/55 leading-relaxed mb-4">
        An off-chain risk agent we call the{" "}
        <strong className="text-white/75">Helmsman</strong> continuously monitors every
        open position, pre-warns users long before a margin call, and triggers
        protective unwinds only when necessary. Revenue comes from the same model
        Aave proved at scale: an interest-rate spread plus a small reserve factor on
        every USDG borrow — sustainable from day one, no token emissions required.
      </p>

      <div className="grid md:grid-cols-3 gap-4 my-10">
        {[
          { title: "Deposit", body: "Supply tokenized stock to the CollateralVault.", href: "/collateral" },
          { title: "Borrow", body: "Draw USDG up to your per-asset capacity.", href: "/borrow" },
          { title: "Repay", body: "Pay back any amount, any time. Withdraw collateral.", href: "/repay" },
        ].map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="border border-white/[0.08] p-5 hover:border-[#B6E324]/30 hover:bg-[#B6E324]/[0.03] transition-colors group"
          >
            <h3 className="font-medium mb-2 text-white group-hover:text-[#B6E324] transition-colors">
              {c.title}
            </h3>
            <p className="text-sm text-white/45 leading-relaxed">{c.body}</p>
          </Link>
        ))}
      </div>

      <Callout type="tip">
        Vela targets <strong className="text-white/75">Robinhood Chain Testnet</strong>{" "}
        (chain ID <code className="font-mono text-[#B6E324]">46630</code>). The five
        whitelisted collateral assets — TSLA, AMZN, PLTR, NFLX, AMD — are deployed
        natively on the testnet. See <Link href="/docs/network" className="underline">Network details</Link>{" "}
        and <Link href="/docs/supported-assets" className="underline">Supported assets</Link>.
      </Callout>

      <h2 className="text-2xl font-display tracking-tight mt-12 mb-5 text-white">Quick start</h2>
      <div className="space-y-3">
        {[
          { step: "01", label: "Understand the use cases", href: "/usecases" },
          { step: "02", label: "Add Robinhood Chain Testnet to your wallet", href: "/network" },
          { step: "03", label: "Get a USDG faucet drip from Paxos", href: "/quickstart" },
          { step: "04", label: "Deposit a tokenized stock as collateral", href: "/collateral" },
          { step: "05", label: "Borrow USDG against your position", href: "/borrow" },
        ].map((s) => (
          <Link
            key={s.step}
            href={s.href}
            className="flex items-center gap-4 p-4 border border-white/[0.07] hover:border-white/20 hover:bg-white/[0.02] transition-colors group"
          >
            <span className="font-mono text-sm text-[#B6E324]/60 shrink-0">{s.step}</span>
            <span className="text-sm text-white/50 group-hover:text-white/75 transition-colors">
              {s.label}
            </span>
            <span className="ml-auto text-white/20 group-hover:text-white/45 transition-colors">→</span>
          </Link>
        ))}
      </div>

      <div className="mt-14 pt-8 border-t border-white/[0.07] flex items-center justify-between text-xs text-white/20 font-mono">
        <span>
          <span className="text-[#B6E324]">Vela</span> · Robinhood Chain Testnet · chainId 46630
        </span>
        <a
          href="https://github.com/vela-protocol/vela"
          className="hover:text-white/45 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Edit on GitHub ↗
        </a>
      </div>
    </>
  );
}
