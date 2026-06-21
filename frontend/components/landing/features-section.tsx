"use client";

import { useState, useEffect, useRef } from "react";
import { useVisible } from "@/hooks/use-visible";

const features = [
  {
    number: "01",
    title: "Spend Without Exiting Yield",
    description:
      "Your deposit stays on Scallop, earning APY around the clock. When you pay, FlowPay borrows against the position, swaps, and settles to the merchant — all in a single atomic Sui PTB. Your principal never leaves the vault.",
    stats: { value: "1 PTB", label: "atomic borrow + swap + send" },
  },
  {
    number: "02",
    title: "Auto-Earn on Every Asset",
    description:
      "Hold a basket — SUI, USDC, BTC, ETH — and every idle unit auto-deposits into the right Scallop pool. sCoins back your vault accounting. APY ticks live in the app. No manual rebalancing, no idle balance.",
    stats: { value: ">5%", label: "live APY on idle balance" },
  },
  {
    number: "03",
    title: "DeepBook Best Execution",
    description:
      "Every spend routes through DeepBook's central limit order book for optimal price discovery. SmartRouter picks the cheapest asset in your basket, sources liquidity from the deepest pool, and delivers the exact token the merchant expects — all on-chain, all verifiable.",
    stats: { value: "CLOB", label: "DeepBook best-execution routing" },
  },
  {
    number: "04",
    title: "OpenZeppelin Safety",
    description:
      "Battle-tested patterns adapted for Sui Move: role-based access control, emergency pause, Pyth oracle staleness guards, and conservative LTV enforced by BorrowGuard. Your money is productive — and protected.",
    stats: { value: "OZ", label: "audited patterns" },
  },
];

function ParticleVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    const COUNT = 70;
    const particles = Array.from({ length: COUNT }, (_, i) => {
      const seed = i * 1.618;
      return {
        bx: (seed * 127.1) % 1,
        by: (seed * 311.7) % 1,
        phase: seed * Math.PI * 2,
        speed: 0.4 + (seed % 0.4),
        radius: 1.2 + (seed % 2.2),
      };
    });

    let time = 0;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particles.forEach((p) => {
        const flowX = Math.sin(time * p.speed * 0.4 + p.phase) * 38;
        const flowY = Math.cos(time * p.speed * 0.3 + p.phase * 0.7) * 24;
        const bx = p.bx * w;
        const by = p.by * h;
        const dx = p.bx - mx;
        const dy = p.by - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist * 2.8);
        const x = bx + flowX + influence * Math.cos(time + p.phase) * 36;
        const y = by + flowY + influence * Math.sin(time + p.phase) * 36;
        const pulse = Math.sin(time * p.speed + p.phase) * 0.5 + 0.5;
        const alpha = 0.08 + pulse * 0.18 + influence * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, p.radius + pulse * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });

      time += 0.016;
      frameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export function FeaturesSection() {
  const { ref: sectionRef, isVisible } = useVisible<HTMLElement>();
  const [, setActiveFeature] = useState(0);

  return (
    <section id="features" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="relative mb-24 lg:mb-32">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
                Protocol
              </span>
              <h2
                className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                Hold the assets.
                <br />
                <span className="text-muted-foreground">Spend the yield.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p
                className={`text-xl text-muted-foreground leading-relaxed transition-all duration-1000 delay-200 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                FlowPay turns your Sui wallet into a checking account that earns. Pay
                anyone, anywhere — and your money keeps compounding while it moves.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-4 lg:gap-6">
          <div
            className={`lg:col-span-12 relative bg-black border border-foreground/10 min-h-[500px] overflow-hidden group transition-all duration-700 flex ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
            onMouseEnter={() => setActiveFeature(0)}
          >
            <div className="relative flex-1 p-8 lg:p-12 bg-black">
              <ParticleVisualization />
              <div className="relative z-10">
                <span className="font-mono text-sm text-muted-foreground">{features[0].number}</span>
                <h3 className="text-3xl lg:text-4xl font-display mt-4 mb-6 group-hover:translate-x-2 transition-transform duration-500">
                  {features[0].title}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md mb-8">
                  {features[0].description}
                </p>
                <div>
                  <span className="text-5xl lg:text-6xl font-display">{features[0].stats.value}</span>
                  <span className="block text-sm text-muted-foreground font-mono mt-2">
                    {features[0].stats.label}
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative w-[42%] shrink-0 overflow-hidden">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled%20Image%20%2812%29-ng3RrNnsPMJ5CrtOjcPTmhHg01W11q.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />
            </div>
          </div>

          {features.slice(1).map((feature, i) => (
            <div
              key={feature.number}
              className={`lg:col-span-4 relative bg-black border border-foreground/10 p-8 overflow-hidden group transition-all duration-700 hover:border-foreground/30 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: `${(i + 1) * 120}ms` }}
              onMouseEnter={() => setActiveFeature(i + 1)}
            >
              <span className="font-mono text-sm text-muted-foreground">{feature.number}</span>
              <h3 className="text-2xl lg:text-3xl font-display mt-4 mb-4 group-hover:translate-x-1 transition-transform duration-300">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">{feature.description}</p>
              <div>
                <span className="text-4xl font-display">{feature.stats.value}</span>
                <span className="block text-xs text-muted-foreground font-mono mt-1">{feature.stats.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
