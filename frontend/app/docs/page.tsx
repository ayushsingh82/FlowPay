import Link from "next/link";
import { Callout } from "./_components/shared";

export default function DocsIntroPage() {
  return (
    <>
      <div className="mb-2">
        <span className="text-xs font-mono text-white/25 uppercase tracking-widest">Overview</span>
      </div>
      <h1 className="text-5xl lg:text-[56px] font-display tracking-tight leading-[0.92] mb-8 text-white">
        What is <span className="text-[#CFFF03]">FlowPay</span>?
      </h1>

      <p className="text-white/55 leading-relaxed mb-4 text-lg">
        <span className="text-[#CFFF03]">FlowPay</span> is a consumer-first
        payment wallet on Sui. You hold a basket of assets — SUI, USDC, BTC, ETH —
        and every idle balance auto-earns on Scallop while you spend.
      </p>
      <p className="text-white/55 leading-relaxed mb-4">
        The magic is a Sui-only superpower: every payment is a single{" "}
        <strong className="text-white/75">Programmable Transaction Block</strong>{" "}
        that borrows against your Scallop position, swaps to the merchant&apos;s
        preferred token, settles, and updates accounting — atomically, in under a
        second, without ever exiting your yield position. DeepBook routing and
        Predict-based FX hedging plug into the same flow.
      </p>

      <div className="grid md:grid-cols-3 gap-4 my-10">
        {[
          { title: "Deposit", body: "Top up FlowVault with any supported asset. Auto-earns on Scallop.", href: "/docs/vault" },
          { title: "Spend", body: "Pay anyone in one atomic PTB. Your yield position keeps compounding.", href: "/docs/spend" },
          { title: "Earn", body: "Live APY on idle balance. Incoming payments auto-repay any borrow.", href: "/docs/earn" },
        ].map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="border border-white/[0.08] p-5 hover:border-[#CFFF03]/30 hover:bg-[#CFFF03]/[0.03] transition-colors group"
          >
            <h3 className="font-medium mb-2 text-white group-hover:text-[#CFFF03] transition-colors">
              {c.title}
            </h3>
            <p className="text-sm text-white/45 leading-relaxed">{c.body}</p>
          </Link>
        ))}
      </div>

      <Callout type="tip">
        FlowPay targets <strong className="text-white/75">Sui Testnet</strong>{" "}
        for Sui Overflow 2026. The default basket — SUI, USDC, BTC, ETH —
        is wired into Scallop pools out of the box. See{" "}
        <Link href="/docs/network" className="underline">Network details</Link>{" "}
        and <Link href="/docs/supported-assets" className="underline">Supported assets</Link>.
      </Callout>

      <h2 className="text-2xl font-display tracking-tight mt-12 mb-5 text-white">Quick start</h2>
      <div className="space-y-3">
        {[
          { step: "01", label: "Understand the use cases", href: "/docs/usecases" },
          { step: "02", label: "Read the architecture overview", href: "/docs/architecture" },
          { step: "03", label: "Switch your wallet to Sui Testnet", href: "/docs/network" },
          { step: "04", label: "Deposit your first asset into FlowVault", href: "/docs/vault" },
          { step: "05", label: "Send your first atomic-PTB payment", href: "/docs/spend" },
        ].map((s) => (
          <Link
            key={s.step}
            href={s.href}
            className="flex items-center gap-4 p-4 border border-white/[0.07] hover:border-white/20 hover:bg-white/[0.02] transition-colors group"
          >
            <span className="font-mono text-sm text-[#CFFF03]/60 shrink-0">{s.step}</span>
            <span className="text-sm text-white/50 group-hover:text-white/75 transition-colors">
              {s.label}
            </span>
            <span className="ml-auto text-white/20 group-hover:text-white/45 transition-colors">→</span>
          </Link>
        ))}
      </div>

      <div className="mt-14 pt-8 border-t border-white/[0.07] flex items-center justify-between text-xs text-white/20 font-mono">
        <span>
          <span className="text-[#CFFF03]">FlowPay</span> · Sui Testnet · Sui Overflow 2026
        </span>
        <a
          href="https://github.com/flowpay/flowpay"
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
