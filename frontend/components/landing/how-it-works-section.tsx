"use client";

import { useEffect, useState } from "react";
import { useVisible } from "@/hooks/use-visible";

const steps = [
  {
    number: "01",
    title: "Deposit",
    subtitle: "any supported asset",
    description:
      "Top up FlowPay with SUI, USDC, BTC, or ETH. Your deposit is wrapped into a FlowVault object and auto-routed into the matching Scallop pool. APY starts ticking the moment the transaction finalizes.",
    code: `await flowpay.deposit({
  asset: USDC,
  amount: 100n * 10n**6n   // 100 USDC
});
// FlowVault opened. Scallop sCoins minted.
// APY: 5.2% on USDC.`,
  },
  {
    number: "02",
    title: "Spend",
    subtitle: "without exiting yield",
    description:
      "Scan a QR or tap a contact. SmartRouter picks the best asset to source from your vault, borrows against your Scallop position so principal stays compounding, and settles to the merchant — all in a single PTB.",
    code: `await flowpay.pay({
  to: merchant,
  amount: 20n * 10n**6n   // 20 USDC
});
// One atomic PTB:
//   borrow → swap → send → emit.
// Your APY counter never blinked.`,
  },
  {
    number: "03",
    title: "Earn",
    subtitle: "while it sits",
    description:
      "Incoming payments land back in the FlowVault and auto-deposit. Outstanding borrows auto-repay from receipts. Withdraw to a self-custodial wallet any time — no lockups, no managed accounts.",
    code: `for await (const tick of flowpay.watchVault(user)) {
  console.log(tick.balance, tick.apy, tick.borrowed);
}
// Balance: $128.41 · APY: 5.2%
// Borrowed: $0 (auto-repaid on receipt).`,
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const { ref: sectionRef, isVisible } = useVisible<HTMLElement>();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-[oklch(0.09_0.01_260)] text-white overflow-hidden"
    >
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/[0.02] blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="relative mb-0 lg:mb-0 grid lg:grid-cols-2 gap-4 lg:gap-12 items-end">
          <div className="overflow-hidden pb-0 lg:pb-32">
            <div
              className={`transition-all duration-1000 ${
                isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"
              }`}
            >
              <span className="inline-flex items-center gap-3 text-sm font-mono text-white/40 mb-8">
                Flow
              </span>
            </div>
            <h2
              className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.85] transition-all duration-1000 delay-100 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
              }`}
            >
              <span className="block">Deposit.</span>
              <span className="block text-white/60">Spend.</span>
              <span className="block text-white/35">Earn.</span>
            </h2>
          </div>

          <div
            className={`relative h-[320px] lg:h-[640px] overflow-hidden transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tree-uAia6REvB137CQyHFCf0za3O6h2zKO.png"
              alt=""
              aria-hidden="true"
              className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.09_0.01_260)] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <button
              key={step.number}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`relative text-left p-8 lg:p-12 border transition-all duration-500 ${
                activeStep === index
                  ? "bg-[#000000] border-white/60"
                  : "bg-[#000000] border-white/25 hover:border-white/50"
              }`}
            >
              <div className="flex items-center gap-4 mb-8">
                <span
                  className={`text-4xl font-display transition-colors duration-300 ${
                    activeStep === index ? "text-[#CFFF03]" : "text-white/20"
                  }`}
                >
                  {step.number}
                </span>
                <div className="flex-1 h-px bg-white/10 overflow-hidden">
                  {activeStep === index && (
                    <div className="h-full bg-[#CFFF03]/50 animate-progress" />
                  )}
                </div>
              </div>

              <h3 className="text-3xl lg:text-4xl font-display mb-2">{step.title}</h3>
              <span className="text-xl text-white/40 font-display block mb-6">{step.subtitle}</span>

              <p
                className={`text-white/60 leading-relaxed mb-6 transition-opacity duration-300 ${
                  activeStep === index ? "opacity-100" : "opacity-60"
                }`}
              >
                {step.description}
              </p>

              {activeStep === index && (
                <pre className="text-xs font-mono text-white/40 bg-white/[0.04] p-4 rounded overflow-x-auto whitespace-pre-wrap">
                  {step.code}
                </pre>
              )}

              <div
                className={`absolute bottom-0 left-0 right-0 h-1 bg-[#CFFF03] transition-transform duration-500 origin-left ${
                  activeStep === index ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .animate-progress {
          animation: progress 6s linear forwards;
        }
      `}</style>
    </section>
  );
}
