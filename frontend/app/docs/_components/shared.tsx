"use client";

import { useState } from "react";

// ── Code block ──────────────────────────────────────────────────────────────
export function Code({ children, lang = "typescript" }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative my-6 border border-white/10 bg-[#0a0a0f]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
        <div className="w-2 h-2 rounded-full bg-red-500/40" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
        <div className="w-2 h-2 rounded-full bg-green-500/40" />
        <span className="ml-2 text-xs font-mono text-white/25">{lang}</span>
        <button
          onClick={copy}
          className="ml-auto text-xs font-mono text-white/25 hover:text-white/60 transition-colors px-2 py-0.5"
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <pre className="p-5 text-sm font-mono text-white/65 overflow-x-auto leading-relaxed whitespace-pre">
        {children.trim()}
      </pre>
    </div>
  );
}

// ── Callout ─────────────────────────────────────────────────────────────────
export function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warn" | "tip";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-blue-500/20 bg-blue-500/5 text-blue-300/70",
    warn: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300/70",
    tip:  "border-[#CFFF03]/20 bg-[#CFFF03]/5 text-[#CFFF03]/75",
  };
  const icons = { info: "ℹ", warn: "⚠", tip: "✦" };
  return (
    <div className={`flex gap-3 p-4 border my-6 text-sm leading-relaxed ${styles[type]}`}>
      <span className="shrink-0 mt-0.5">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

// ── Typography ───────────────────────────────────────────────────────────────
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-3xl font-display tracking-tight mt-12 mb-5 text-white">{children}</h2>;
}
export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-medium mt-8 mb-3 text-white/85">{children}</h3>;
}
export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-white/55 leading-relaxed mb-4">{children}</p>;
}
