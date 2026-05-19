"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const sections = [
  {
    group: "Overview",
    items: [
      { slug: "", label: "What is Vela?" },
      { slug: "usecases", label: "Use cases" },
      { slug: "architecture", label: "Architecture" },
    ],
  },
  {
    group: "Protocol",
    items: [
      { slug: "collateral", label: "Collateral & LTV" },
      { slug: "borrow", label: "Borrowing USDG" },
      { slug: "repay", label: "Repay & withdraw" },
      { slug: "liquidations", label: "Liquidations" },
      { slug: "interest-model", label: "Interest model" },
      { slug: "oracle", label: "Price oracle" },
    ],
  },
  {
    group: "Agent",
    items: [
      { slug: "agent-overview", label: "Helmsman overview" },
      { slug: "agent-risk", label: "Risk monitoring" },
      { slug: "agent-actions", label: "Protective actions" },
    ],
  },
  {
    group: "Contracts",
    items: [
      { slug: "contracts-overview", label: "Overview" },
      { slug: "contracts-pool", label: "LendingPool" },
      { slug: "contracts-vault", label: "CollateralVault" },
      { slug: "contracts-liquidator", label: "Liquidator" },
      { slug: "contracts-deployments", label: "Deployments" },
    ],
  },
  {
    group: "Integration",
    items: [
      { slug: "quickstart", label: "Quickstart" },
      { slug: "supported-assets", label: "Supported assets" },
      { slug: "network", label: "Network details" },
    ],
  },
  {
    group: "Resources",
    items: [
      { slug: "security", label: "Security model" },
      { slug: "faq", label: "FAQ" },
    ],
  },
];

function Sidebar() {
  const pathname = usePathname();

  const isActive = (slug: string) => {
    if (slug === "") return pathname === "/docs";
    return pathname === `/docs/${slug}`;
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-white/[0.07]"
      style={{ background: "oklch(0.06 0.008 260)" }}
    >
      <nav
        className="docs-sidebar flex-1 overflow-y-auto py-8 px-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.07) transparent",
        }}
      >
        {sections.map((group) => (
          <div key={group.group} className="mb-7">
            <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.12em] mb-2 px-3">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={item.slug === "" ? "/docs" : `/docs/${item.slug}`}
                    className={`block text-sm px-3 py-1.5 transition-colors rounded-sm ${
                      isActive(item.slug)
                        ? "text-[#B6E324] bg-[#B6E324]/[0.08]"
                        : "text-white/65 hover:text-white/90 hover:bg-white/[0.05]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function DocsShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "oklch(0.06 0.008 260)" }}
    >
      <header
        className="sticky top-0 z-50 border-b border-white/[0.07] backdrop-blur-md"
        style={{ background: "oklch(0.06 0.008 260 / 0.95)" }}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-display text-white/80 hover:text-white transition-colors"
            >
              <Image
                src="/logo.svg"
                alt="Vela"
                width={22}
                height={22}
                className="opacity-80 hover:opacity-100 transition-opacity"
              />
              <span>
                Ve<span className="text-[#B6E324]">la</span>
              </span>
            </Link>
            <span className="text-white/15">/</span>
            <span className="text-sm font-mono text-white/35">docs</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/vela-protocol/vela"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/35 hover:text-white/70 transition-colors font-mono"
            >
              GitHub ↗
            </a>
            <Link
              href="/pitch"
              className="text-sm font-mono border border-white/15 px-4 py-1.5 text-white/50 hover:text-white hover:border-white/30 transition-colors"
            >
              Open pitch
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-8 lg:px-14 py-12 lg:py-14 max-w-[820px]">
          {children}
        </main>
      </div>
    </div>
  );
}
