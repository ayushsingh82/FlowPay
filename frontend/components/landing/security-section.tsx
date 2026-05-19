"use client";

import { useEffect, useState } from "react";
import { useVisible } from "@/hooks/use-visible";
import { Shield, Activity, AlertTriangle, GitBranch } from "lucide-react";

const securityFeatures = [
  {
    icon: Activity,
    title: "Per-asset risk parameters",
    description:
      "TSLA isn't AMZN. Each collateral type carries its own LTV, liquidation threshold and reserve factor, tuned to 30-day realized volatility.",
    image: "/images/shield.png",
  },
  {
    icon: AlertTriangle,
    title: "Pre-warning agent",
    description:
      "The Helmsman agent watches every open position. It pings you long before your health bar turns red — and suggests the smallest fix.",
    image: "/images/isolated.jpg",
  },
  {
    icon: Shield,
    title: "Soft liquidations first",
    description:
      "Vela tries partial unwinds before full liquidation. The goal is preserving your collateral, not maximizing keeper revenue.",
    image: "/images/encrypted.jpg",
  },
  {
    icon: GitBranch,
    title: "Non-custodial by construction",
    description:
      "Your stocks live in an immutable vault you can always exit. No multisig holds them. No team key can pause your withdrawal.",
    image: "/images/audit.jpg",
  },
];

const properties = ["Onchain settlement", "Open source", "Transparent reserves", "No emissions"];

export function SecuritySection() {
  const { ref: sectionRef, isVisible } = useVisible<HTMLElement>();
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % securityFeatures.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="security" ref={sectionRef} className="relative py-32 lg:py-40 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-20">
          <span
            className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            Risk
          </span>

          <h2
            className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] mb-12 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Liquidation
            <br />
            <span className="text-muted-foreground">should be the last resort.</span>
          </h2>

          <div
            className={`transition-all duration-1000 delay-100 ${isVisible ? "opacity-100" : "opacity-0"}`}
          >
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              In TradFi, your prime broker calls you before the margin call. Vela does the same —
              the <span className="text-[#B6E324]">Helmsman</span> agent watches every position
              continuously and gives you the smallest possible fix before forced action.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          <div
            className={`lg:col-span-7 relative p-8 lg:p-12 border border-foreground/10 min-h-[400px] overflow-hidden transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="absolute inset-0 pointer-events-none items-center justify-end hidden lg:flex">
              {securityFeatures.map((feature, index) => (
                <img
                  key={feature.image}
                  src={feature.image}
                  alt={feature.title}
                  className="absolute h-3/4 w-3/4 object-contain object-right transition-opacity duration-500"
                  style={{ opacity: activeFeature === index ? 0.85 : 0 }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <span className="font-mono text-sm text-muted-foreground">Risk principles</span>
              <div className="mt-8">
                <span className="text-7xl lg:text-8xl font-display">4</span>
                <span className="block text-muted-foreground mt-2">
                  guardrails on every open position
                </span>
              </div>
            </div>

            <div className="absolute bottom-8 left-8 right-8 flex flex-wrap gap-2">
              {properties.map((prop, index) => (
                <span
                  key={prop}
                  className={`px-3 py-1 border border-foreground/10 text-xs font-mono text-muted-foreground transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 100 + 300}ms` }}
                >
                  {prop}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            {securityFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className={`p-6 border transition-all duration-500 cursor-default ${
                  activeFeature === index
                    ? "border-foreground/30 bg-foreground/[0.04]"
                    : "border-foreground/10"
                } ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
                style={{ transitionDelay: `${index * 80}ms` }}
                onClick={() => setActiveFeature(index)}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`shrink-0 w-10 h-10 flex items-center justify-center border transition-colors ${
                      activeFeature === index
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/20"
                    }`}
                  >
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
