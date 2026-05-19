"use client";

import { useVisible } from "@/hooks/use-visible";

const features = [
  {
    title: "viem + wagmi",
    description: "Typed Robinhood Chain client. Drop the chain into your app in 5 lines.",
  },
  {
    title: "REST risk API",
    description: "Query a position's health, projected liquidation price, and Helmsman alerts.",
  },
  {
    title: "Webhook events",
    description: "Subscribe to Deposit, Borrow, Repay, Liquidation events with HMAC signing.",
  },
  {
    title: "Open contracts",
    description: "LendingPool, CollateralVault, OracleAdapter — all verified on testnet.",
  },
];

const codeSnippet = `import { createWalletClient, custom } from "viem";
import { vela, LENDING_POOL, TSLA, USDG } from "@vela/sdk";

const wallet = createWalletClient({
  chain: vela.chains.robinhoodTestnet,
  transport: custom(window.ethereum),
});

// 1. Deposit 10 TSLA as collateral
await vela.deposit({ wallet, asset: TSLA, amount: 10n * 10n ** 18n });

// 2. Borrow 3,000 USDG
await vela.borrow({ wallet, amount: 3_000n * 10n ** 6n });

// 3. Stream health updates from the Helmsman agent
for await (const tick of vela.watchHealth({ user: wallet.account.address })) {
  console.log(tick.health, tick.liqPrice, tick.suggestion);
}`;

export function DevelopersSection() {
  const { ref: sectionRef, isVisible } = useVisible<HTMLElement>();

  return (
    <section id="developers" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div
        className={`absolute bottom-0 right-0 w-[55%] h-[85%] pointer-events-none transition-all duration-1000 delay-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled%20Image%20%2813%29-OQ2DiR3ElVsUg8kTvTL1kC5A3Q6maM.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-left-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          className={`mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            For developers
          </span>
          <h2 className="text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9]">
            Compose credit
            <br />
            <span className="text-muted-foreground">into anything.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div
            className={`transition-all duration-700 delay-100 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-md">
              Wallets, brokerages, payment apps — any product where users hold equity exposure
              can offer instant USDG liquidity on top of Vela.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 50 + 200}ms` }}
                >
                  <h3 className="font-medium mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex gap-4">
              <a
                href="/docs"
                className="inline-flex items-center gap-2 text-sm font-mono border border-foreground/20 px-5 py-2.5 hover:bg-foreground/5 transition-colors"
              >
                Read the docs →
              </a>
              <a
                href="https://github.com/vela-protocol/vela"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub ↗
              </a>
            </div>
          </div>

          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="border border-foreground/10 bg-black/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-foreground/10">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs font-mono text-muted-foreground">example.ts</span>
              </div>
              <pre className="p-6 text-xs font-mono text-white/70 overflow-x-auto leading-relaxed whitespace-pre">
                {codeSnippet}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
