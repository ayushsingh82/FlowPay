"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const ACCENT = "#BE185D";

const HERO_VIDEO =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4";

// ─── Layout: full-bleed media bg + text overlay ───────────────────────────────

function MediaSlide({
  eyebrow,
  heading,
  children,
  media,
  mediaType = "image",
  textSide = "left",
  headingSize = "clamp(2.5rem, 3.8vw, 4rem)",
}: {
  eyebrow?: string;
  heading: React.ReactNode;
  children: React.ReactNode;
  media: string;
  mediaType?: "image" | "video";
  textSide?: "left" | "right";
  headingSize?: string;
}) {
  const gradientDir =
    textSide === "left"
      ? "to right, #000 45%, rgba(0,0,0,0.5) 70%, transparent 100%"
      : "to left,  #000 45%, rgba(0,0,0,0.5) 70%, transparent 100%";

  const textAlign = textSide === "left" ? "left" : "right";
  const textPad = textSide === "left" ? "pl-16 lg:pl-24 pr-8" : "pr-16 lg:pr-24 pl-8";

  return (
    <div className="relative flex h-full w-full overflow-hidden" style={{ background: "#000" }}>
      <div
        className={`absolute inset-0 flex items-center ${
          textSide === "left" ? "justify-end" : "justify-start"
        }`}
      >
        {mediaType === "video" ? (
          <video
            className="h-full w-auto max-w-[65%] object-contain"
            autoPlay
            loop
            muted
            playsInline
            style={{ opacity: 0.75 }}
          >
            <source src={media} type="video/mp4" />
          </video>
        ) : (
          <div className="relative h-full" style={{ width: "55%" }}>
            <Image src={media} alt="" fill className="object-contain" style={{ opacity: 0.85 }} />
          </div>
        )}
      </div>

      <div className="absolute inset-0" style={{ background: `linear-gradient(${gradientDir})` }} />

      <div
        className={`relative z-10 flex flex-col justify-center h-full ${textPad} max-w-[55%] ${
          textSide === "right" ? "ml-auto" : ""
        }`}
      >
        {eyebrow && (
          <p
            className={`text-2xl font-mono uppercase tracking-widest mb-5 text-${textAlign}`}
            style={{ color: ACCENT }}
          >
            {eyebrow}
          </p>
        )}
        <div
          className={`font-display tracking-tight text-white mb-8 leading-tight text-${textAlign}`}
          style={{ fontSize: headingSize }}
        >
          {heading}
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Slides ───────────────────────────────────────────────────────────────────

function Slide1Title() {
  return (
    <div className="relative flex h-full w-full overflow-hidden" style={{ background: "#000" }}>
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        style={{ opacity: 0.45 }}
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.50) 60%, rgba(0,0,0,0.30) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col justify-center h-full pl-16 lg:pl-24 max-w-[60%]">
        <div className="flex items-center gap-4 mb-6">
          <img src="/logo.svg" alt="FlowPay" className="w-12 h-12" />
          <h1 className="text-5xl lg:text-6xl font-display tracking-tight text-white">
            Flow<span style={{ color: ACCENT }}>Pay</span>
          </h1>
        </div>

        <p className="text-lg text-white/60 font-mono mb-10 leading-relaxed">
          The payment app where your money never stops earning.
          <br />
          Multi-asset wallet on Sui · Scallop yield · atomic PTB spend.
        </p>

        <p className="text-sm text-white/30 font-mono">
          Sui Overflow 2026 · DeFi &amp; Payments track
        </p>
      </div>
    </div>
  );
}

function Slide2Problem() {
  return (
    <MediaSlide
      eyebrow="The Problem"
      heading={
        <>
          Today&apos;s stablecoin
          <br />
          apps make you choose.
        </>
      }
      media="/images/audit.jpg"
      textSide="left"
    >
      <div className="space-y-3">
        {[
          {
            title: "Earn or spend — never both",
            body: "To pay, you withdraw from yield. APY resets to zero. The friction kills compounding.",
          },
          {
            title: "Manual swaps, every time",
            body: "Merchant wants USDC. You hold SUI. Open a DEX. Pay slippage. Try not to fat-finger the address.",
          },
          {
            title: "Custodial apps earn 0%",
            body: "Cash App and Venmo are easy — and they pay you nothing on the float. Billions sit idle.",
          },
          {
            title: "Self-custodial apps are scary",
            body: "Seed phrases. Network IDs. Gas tokens. The UX of crypto wallets has never been ready for normal people.",
          },
        ].map((item) => (
          <div key={item.title} className="flex gap-4 border border-white/25 p-4">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
              style={{ background: ACCENT }}
            />
            <div>
              <p className="text-white font-mono text-sm mb-0.5">{item.title}</p>
              <p className="text-white/55 text-sm leading-relaxed">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </MediaSlide>
  );
}

function Slide3Solution() {
  return (
    <MediaSlide
      eyebrow="The Solution"
      heading={
        <>
          One atomic PTB.
          <br />
          Earn + spend + settle.
        </>
      }
      headingSize="clamp(2.2rem, 3.4vw, 3.6rem)"
      media="/images/encrypted.jpg"
      textSide="right"
    >
      <p className="text-white/60 text-base mb-6 leading-relaxed text-right">
        Hold a basket on Sui. Idle balance auto-earns on Scallop. Every spend
        borrows against your position, swaps if needed, and settles to the
        merchant — all in one atomic transaction. Your APY counter never blinks.
      </p>
      <div className="space-y-3">
        {[
          { step: "01", label: "Deposit", desc: "asset → FlowVault", color: "#34d399" },
          { step: "02", label: "Auto-earn", desc: "Scallop pool, live APY", color: ACCENT },
          { step: "03", label: "Atomic spend", desc: "borrow → swap → send", color: "#60a5fa" },
        ].map((s) => (
          <div
            key={s.step}
            className="flex items-center gap-4 border border-white/25 px-5 py-3"
          >
            <span className="text-xs font-mono" style={{ color: s.color }}>
              {s.step}
            </span>
            <span className="text-white font-mono text-sm flex-1">{s.label}</span>
            <span
              className="text-xs font-mono px-3 py-1 border"
              style={{ color: s.color, borderColor: s.color + "44" }}
            >
              {s.desc}
            </span>
          </div>
        ))}
      </div>
    </MediaSlide>
  );
}

function Slide4WhyNow() {
  return (
    <MediaSlide
      eyebrow="Why Now"
      heading={<>Three lines crossed in 2026.</>}
      headingSize="clamp(2.2rem, 3.4vw, 3.6rem)"
      media="/images/bridge.png"
      textSide="left"
    >
      <div className="space-y-3">
        {[
          {
            title: "Sui PTBs unlocked atomic spend",
            body: "No other chain can compose borrow + swap + settle in a single revertible transaction. FlowPay is built on the only rail that can.",
          },
          {
            title: "Scallop crossed institutional scale",
            body: "Audited lending pools across SUI, USDC, BTC, and ETH. The yield engine is production-ready.",
          },
          {
            title: "zkLogin made onboarding sane",
            body: "Sign in with Google → wallet exists. No seed phrases, no faucet hunt. The last UX wall fell.",
          },
          {
            title: "Sui Overflow 2026 funds the rails",
            body: "$500K+ across DeFi & Payments and DeepBook specialized pools. Right track, right moment.",
          },
        ].map((item) => (
          <div key={item.title} className="flex gap-4 border border-white/25 p-4">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
              style={{ background: ACCENT }}
            />
            <div>
              <p className="text-white font-mono text-sm mb-0.5">{item.title}</p>
              <p className="text-white/55 text-sm">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </MediaSlide>
  );
}

function Slide5Product() {
  return (
    <MediaSlide
      eyebrow="Product"
      heading={<>Three modules. One PTB.</>}
      headingSize="clamp(2.5rem, 3.8vw, 4rem)"
      media="/images/isolated.jpg"
      textSide="right"
    >
      <div
        className="mb-5 border border-white/25 p-5"
        style={{ background: "rgba(0,0,0,0.6)" }}
      >
        <p className="text-xs font-mono text-white/40 mb-3 uppercase tracking-widest">
          SDK · 3 calls
        </p>
        <div className="font-mono text-sm space-y-2">
          <p>
            <span style={{ color: ACCENT }}>flowpay</span>
            <span className="text-white/40">.deposit(</span>
            <span className="text-white/80">asset, amount</span>
            <span className="text-white/40">)</span>
          </p>
          <p>
            <span style={{ color: ACCENT }}>flowpay</span>
            <span className="text-white/40">.pay(</span>
            <span className="text-white/80">to, amount</span>
            <span className="text-white/40">)</span>
          </p>
          <p>
            <span style={{ color: ACCENT }}>flowpay</span>
            <span className="text-white/40">.watchVault(</span>
            <span className="text-white/80">user</span>
            <span className="text-white/40">)</span>
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {[
          "FlowVault, SmartRouter, BorrowGuard — Sui Move",
          "Scallop = yield engine · Pyth = price oracle",
          "DeepBook hooks reserved in SmartRouter",
          "Live on Sui Testnet for Sui Overflow 2026",
        ].map((item) => (
          <div key={item} className="flex gap-3 text-sm text-white/60 justify-end">
            <span>{item}</span>
            <span style={{ color: ACCENT + "80" }}>→</span>
          </div>
        ))}
      </div>
    </MediaSlide>
  );
}

function Slide6Business() {
  return (
    <MediaSlide
      eyebrow="Sponsor Stack"
      heading={<>Built on the strongest rails.</>}
      headingSize="clamp(2.5rem, 3.8vw, 4rem)"
      media="/images/permissions.jpg"
      textSide="left"
    >
      <div
        className="mb-5 border p-5"
        style={{ borderColor: ACCENT + "55", background: "rgba(0,0,0,0.7)" }}
      >
        <p
          className="text-xs font-mono uppercase tracking-widest mb-2"
          style={{ color: ACCENT + "99" }}
        >
          Prize stack — dual eligible
        </p>
        <p className="text-6xl font-display text-white">
          $100<span className="text-3xl text-white/40">K+ realistic</span>
        </p>
        <p className="text-sm text-white/50 mt-2">
          DeFi &amp; Payments core ($30K) + DeepBook specialized pool ($70K share).
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-mono text-white/35 uppercase tracking-widest mb-3">
          Sponsor integration depth
        </p>
        {[
          {
            tier: "Scallop",
            desc: "Yield engine. Every deposit, every borrow. Core dependency.",
            color: "#34d399",
          },
          {
            tier: "DeepBook",
            desc: "Spot routing on every spend. Predict for FX. Margin for BNPL.",
            color: ACCENT,
          },
          {
            tier: "OpenZeppelin",
            desc: "Battle-tested patterns: access control, pause, oracle guards.",
            color: "#a78bfa",
          },
        ].map((item) => (
          <div
            key={item.tier}
            className="flex items-center gap-4 border border-white/25 px-4 py-3"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <span
              className="text-xs font-mono px-2 py-1 border shrink-0"
              style={{ color: item.color, borderColor: item.color + "55" }}
            >
              {item.tier}
            </span>
            <p className="text-sm text-white/60">{item.desc}</p>
          </div>
        ))}
      </div>
    </MediaSlide>
  );
}

function Slide7Roadmap() {
  return (
    <MediaSlide
      eyebrow="Roadmap"
      heading={<>Hackathon → mainnet.</>}
      media="/images/whale.png"
      textSide="right"
    >
      <div className="space-y-5">
        {[
          {
            date: "May 2026",
            label: "Submission",
            done: true,
            upcoming: false,
            items: ["Frontend + docs", "Vault + router + guard skeleton", "Live on Sui Testnet"],
          },
          {
            date: "June 2026",
            label: "DeepBook integration",
            done: false,
            upcoming: true,
            items: ["Spot routing live", "Predict FX rate-lock", "Margin BNPL"],
          },
          {
            date: "Q3 2026",
            label: "Public testnet",
            done: false,
            upcoming: false,
            items: ["Merchant SDK", "Family/group vaults", "First design partners"],
          },
          {
            date: "Q4 2026",
            label: "Mainnet alpha",
            done: false,
            upcoming: false,
            items: ["Audited modules", "Multisig governance", "Mainnet on Sui"],
          },
        ].map((row, i) => (
          <div key={row.label} className="flex gap-4 items-start">
            <div className="flex flex-col items-center shrink-0 pt-1">
              <div
                className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: row.done
                    ? "#34d399"
                    : row.upcoming
                    ? ACCENT
                    : "rgba(255,255,255,0.25)",
                  background: row.done ? "#34d399" : "transparent",
                }}
              >
                {row.done && (
                  <span className="text-[8px] text-black font-bold leading-none">✓</span>
                )}
              </div>
              {i < 3 && (
                <div
                  className="w-px h-4 mt-1"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <p className="text-sm font-mono text-white">{row.label}</p>
                <span className="text-xs font-mono text-white/35">{row.date}</span>
                {row.upcoming && (
                  <span
                    className="text-xs font-mono px-2 py-0.5 border"
                    style={{ color: ACCENT, borderColor: ACCENT + "44" }}
                  >
                    upcoming
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3">
                {row.items.map((item) => (
                  <span key={item} className="text-xs text-white/45">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </MediaSlide>
  );
}

function Slide8Vision() {
  return (
    <div className="relative flex h-full w-full overflow-hidden" style={{ background: "#000" }}>
      <div className="absolute right-0 top-0 h-full flex items-center">
        <div className="relative h-full" style={{ width: "50vw" }}>
          <Image
            src="/images/shield.png"
            alt=""
            fill
            className="object-contain object-right"
            style={{ opacity: 0.9 }}
          />
        </div>
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, #000 50%, rgba(0,0,0,0.4) 75%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col justify-center h-full px-16 lg:px-24 max-w-[55%]">
        <p
          className="text-xs font-mono uppercase tracking-widest mb-6"
          style={{ color: ACCENT }}
        >
          Vision
        </p>
        <h2 className="text-6xl lg:text-7xl font-display tracking-tight text-white mb-8 leading-tight">
          The checking account
          <br />
          that earns by default.
        </h2>
        <div className="space-y-3 mb-10">
          {[
            "Every Sui wallet deserves to earn",
            "Every payment deserves to be atomic",
            "Every consumer deserves a UX that just works",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 text-white/65 text-sm">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: ACCENT }}
              />
              {item}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-5 text-sm font-mono text-white/35 border-t border-white/15 pt-6">
          <a
            href="https://github.com/ayushsingh82/FlowPay"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/65 transition-colors"
          >
            github.com/ayushsingh82/FlowPay ↗
          </a>
          <span className="text-white/10">·</span>
          <span>Sui Testnet live</span>
        </div>
      </div>
    </div>
  );
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const SLIDES = [
  { component: Slide1Title, label: "Title" },
  { component: Slide2Problem, label: "Problem" },
  { component: Slide3Solution, label: "Solution" },
  { component: Slide4WhyNow, label: "Why Now" },
  { component: Slide5Product, label: "Product" },
  { component: Slide6Business, label: "Sponsors" },
  { component: Slide7Roadmap, label: "Roadmap" },
  { component: Slide8Vision, label: "Vision" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  const go = (n: number) => {
    if (n >= 0 && n < total) setCurrent(n);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(current + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(current - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current]);

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{ background: "#000" }}
    >
      <div className="flex-1 relative overflow-hidden">
        <div
          className="flex h-full"
          style={{
            width: `${total * 100}%`,
            transform: `translateX(-${(current / total) * 100}%)`,
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {SLIDES.map(({ component: SlideComp }, i) => (
            <div key={i} className="h-full" style={{ width: `${100 / total}%` }}>
              <SlideComp />
            </div>
          ))}
        </div>
      </div>

      <div
        className="h-14 border-t border-white/10 flex items-center justify-between px-8 shrink-0"
        style={{ background: "#000" }}
      >
        <span className="text-xs font-mono text-white/30 w-32">
          {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} —{" "}
          {SLIDES[current].label}
        </span>

        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="transition-all duration-300"
              style={{
                width: i === current ? "24px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: i === current ? ACCENT : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 w-32 justify-end">
          <button
            onClick={() => go(current - 1)}
            disabled={current === 0}
            className="w-9 h-9 border border-white/25 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-sm"
          >
            ←
          </button>
          <button
            onClick={() => go(current + 1)}
            disabled={current === total - 1}
            className="w-9 h-9 border border-white/25 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-sm"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
