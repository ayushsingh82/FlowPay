import { notFound } from "next/navigation";
import Link from "next/link";
import { Callout, Code, H2, H3, P } from "../_components/shared";

type Page = {
  group: string;
  title: string;
  intro: string;
  body: React.ReactNode;
};

const PAGES: Record<string, Page> = {
  // ── Overview ─────────────────────────────────────────────────────────────
  usecases: {
    group: "Overview",
    title: "Use cases",
    intro:
      "FlowPay collapses earning and spending into one surface. Anything you do with money on Sui can plug in.",
    body: (
      <>
        <H2>Consumer payments</H2>
        <P>
          Pay anyone with a Sui address or scanned QR. The PTB borrows against
          your Scallop position so your principal keeps compounding. No
          withdraw-swap-send dance.
        </P>
        <H2>Merchant checkout</H2>
        <P>
          Merchants accept any supported asset and receive their preferred
          token. Routing happens inside the PTB. Idle merchant balances
          auto-earn on Scallop until cash-out.
        </P>
        <H2>Payroll & subscriptions</H2>
        <P>
          Streams sit in the FlowVault and earn yield until each payout date.
          Recurring subscriptions debit the borrow line and self-repay from the
          next deposit.
        </P>
        <H2>Cross-border sends</H2>
        <P>
          Send USDC to a friend abroad; the recipient receives a local-pegged
          token if available. Optional Predict-based rate lock for upcoming
          bills.
        </P>
      </>
    ),
  },
  architecture: {
    group: "Overview",
    title: "Architecture",
    intro:
      "FlowPay is three Move modules, a thin TypeScript SDK, and a PWA. Nothing custodial sits between you and Sui.",
    body: (
      <>
        <H2>System diagram</H2>
        <Code lang="ascii">{`
PWA  →  FlowPay SDK  →  PTB builder  →  Sui Testnet
                              │
                              ├─ FlowVault (Move)
                              ├─ SmartRouter (Move)
                              └─ BorrowGuard (Move)
                                   ↓
                              Scallop · DeepBook · Pyth
`}</Code>
        <H2>What happens on every spend</H2>
        <P>
          BorrowGuard checks your health factor → Scallop is asked to release
          borrowed liquidity → SmartRouter (with DeepBook hooks reserved)
          settles the swap → funds transfer to the recipient → an event is
          emitted. All inside one PTB, all-or-nothing.
        </P>
      </>
    ),
  },

  // ── Protocol ─────────────────────────────────────────────────────────────
  vault: {
    group: "Protocol",
    title: "FlowVault & assets",
    intro:
      "FlowVault is a per-user Sui object that holds the basket of supported assets and tracks each Scallop position via sCoins.",
    body: (
      <>
        <H2>What&apos;s inside a FlowVault</H2>
        <P>
          A FlowVault is a shared object owned by you. It holds per-asset
          deposits, the matching Scallop sCoin balances, and an obligation
          reference if you have an outstanding borrow.
        </P>
        <H2>Default basket</H2>
        <P>The first hackathon release ships with four assets:</P>
        <Code lang="move">{`SUI  ·  USDC  ·  BTC (wormhole)  ·  ETH (wormhole)`}</Code>
        <Callout type="tip">
          Every supported asset has a matching Scallop pool. Deposits auto-route
          on first transfer.
        </Callout>
      </>
    ),
  },
  spend: {
    group: "Protocol",
    title: "The atomic spend PTB",
    intro:
      "Every payment is one Programmable Transaction Block. Borrow, swap, send, emit — atomic, all-or-nothing, sub-second on Sui.",
    body: (
      <>
        <H2>The five operations</H2>
        <P>A single spend is composed of five Move calls inside one PTB:</P>
        <Code lang="move">{`// 1. Pre-trade health check
borrow_guard::check_health_factor(&vault, amount);

// 2. Borrow against Scallop position
let funds = scallop::borrow<USDC>(&mut obligation, amount);

// 3. Route through DeepBook if merchant wants a different token
let payout = smart_router::route(funds, merchant_token, min_out);

// 4. Transfer to merchant
transfer::public_transfer(payout, merchant);

// 5. Emit spend event
event::emit(SpendEvent { user, amount, merchant });`}</Code>
        <Callout type="tip">
          Because it&apos;s one PTB, gas is paid once and the whole thing reverts
          if any step fails. Your principal stays where it is.
        </Callout>
      </>
    ),
  },
  earn: {
    group: "Protocol",
    title: "Earn & auto-yield",
    intro:
      "Every supported asset in your basket is auto-deposited into the right Scallop pool. APY ticks live in the app.",
    body: (
      <>
        <H2>Yield routing</H2>
        <P>
          On deposit, FlowVault calls into the matching Scallop pool and stores
          the returned sCoin balance. Withdrawals reverse the flow and net any
          accrued interest.
        </P>
        <H2>Live APY</H2>
        <P>
          The SDK subscribes to per-pool rate updates and surfaces a blended
          APY across your basket. Numbers update in real time.
        </P>
      </>
    ),
  },
  borrow: {
    group: "Protocol",
    title: "Borrow against position",
    intro:
      "Spend without selling. BorrowGuard enforces conservative LTV so your yield position keeps compounding.",
    body: (
      <>
        <H2>How it works</H2>
        <P>
          When you spend more than your free balance, FlowPay opens a Scallop
          borrow against the deposit. Incoming receipts auto-repay the borrow
          before re-depositing the remainder.
        </P>
        <H2>LTV defaults</H2>
        <Code lang="move">{`max_ltv: 40%   // conservative by default
warn_ltv: 30%  // UI nudges to top up or repay
liq_ltv: 60%   // Scallop liquidation threshold`}</Code>
      </>
    ),
  },
  oracle: {
    group: "Protocol",
    title: "Price oracle",
    intro:
      "Every borrow checks a Pyth price feed. Stale prices revert the PTB — no silent bad pricing.",
    body: (
      <>
        <H2>Why Pyth</H2>
        <P>
          Pyth provides first-party price data with publish-time guarantees.
          BorrowGuard treats any feed older than the configured threshold as a
          hard revert.
        </P>
        <Code lang="move">{`const MAX_AGE_SECONDS: u64 = 30;

let price = pyth::get_price(feed_id);
assert!(price.publish_time + MAX_AGE_SECONDS >= clock::now(), E_STALE_PRICE);`}</Code>
      </>
    ),
  },
  pause: {
    group: "Protocol",
    title: "Emergency pause",
    intro:
      "A multisig-gated switch halts deposits, spends, and borrows atomically. The vault stays intact.",
    body: (
      <>
        <H2>Scope</H2>
        <P>
          Pause halts new operations only. Existing positions remain owned by
          you and withdrawable in fail-safe mode. The pause flag is checked at
          the top of every entry function.
        </P>
        <Callout type="warn">
          If you ever see the pause banner in the app, withdraw from fail-safe
          mode and wait for the post-mortem before re-engaging.
        </Callout>
      </>
    ),
  },

  // ── Sponsors ─────────────────────────────────────────────────────────────
  scallop: {
    group: "Sponsors",
    title: "Scallop integration",
    intro:
      "Scallop is the yield engine. Every deposit lands in a Scallop pool. Every spend can borrow against the position.",
    body: (
      <>
        <H2>What we use</H2>
        <P>Three Scallop surfaces sit at the core of FlowPay:</P>
        <ul className="list-disc list-inside text-white/55 leading-relaxed space-y-2 mb-4">
          <li><strong className="text-white/80">Lending pools</strong> — per-asset deposits earn the supply APY</li>
          <li><strong className="text-white/80">sCoins</strong> — used as the FlowVault accounting token</li>
          <li><strong className="text-white/80">Borrow lines</strong> — backstop every atomic spend</li>
        </ul>
        <Callout type="tip">
          A future release will lock SCA via veSCA from the FlowPay treasury to
          boost user supply rates.
        </Callout>
      </>
    ),
  },
  deepbook: {
    group: "Sponsors",
    title: "DeepBook (coming soon)",
    intro:
      "DeepBook will power per-transaction spot routing and FX rate locks via Predict. Tracked in deepbook-integration.md.",
    body: (
      <>
        <H2>Planned surfaces</H2>
        <ul className="list-disc list-inside text-white/55 leading-relaxed space-y-2 mb-4">
          <li><strong className="text-white/80">Spot</strong> — best-execution routing on every spend</li>
          <li><strong className="text-white/80">Predict</strong> — lock today&apos;s FX rate for upcoming bills</li>
          <li><strong className="text-white/80">Margin</strong> — &quot;spend tomorrow&quot; BNPL without selling</li>
          <li><strong className="text-white/80">DEEP</strong> — cashback + staking flywheel</li>
        </ul>
        <Callout type="warn">
          DeepBook integration is queued for the next sprint. SmartRouter
          already exposes the routing seam.
        </Callout>
      </>
    ),
  },
  openzeppelin: {
    group: "Sponsors",
    title: "OpenZeppelin patterns",
    intro:
      "FlowPay adapts OpenZeppelin's audited patterns to Sui Move — access control, pausability, oracle staleness, and conservative LTV.",
    body: (
      <>
        <H2>What we adopt</H2>
        <ul className="list-disc list-inside text-white/55 leading-relaxed space-y-2 mb-4">
          <li><strong className="text-white/80">Access control</strong> — role-based on every module</li>
          <li><strong className="text-white/80">Pausable</strong> — single switch halts the surface</li>
          <li><strong className="text-white/80">Ownable / upgrade authority</strong> — explicit, multisig-gated</li>
          <li><strong className="text-white/80">Oracle guards</strong> — Pyth staleness assertions</li>
        </ul>
      </>
    ),
  },

  // ── Modules ──────────────────────────────────────────────────────────────
  "contracts-overview": {
    group: "Modules",
    title: "Modules overview",
    intro:
      "FlowPay ships three core Move modules. Each module has a single responsibility and emits typed events.",
    body: (
      <ul className="list-disc list-inside text-white/55 leading-relaxed space-y-2 mb-4">
        <li><strong className="text-white/80">FlowVault</strong> — user deposits + sCoin accounting</li>
        <li><strong className="text-white/80">SmartRouter</strong> — per-tx asset selection + PTB builder seams</li>
        <li><strong className="text-white/80">BorrowGuard</strong> — LTV checks + Pyth oracle staleness</li>
      </ul>
    ),
  },
  "contracts-vault": {
    group: "Modules",
    title: "FlowVault",
    intro: "Per-user Sui object that owns deposits, sCoin balances, and the borrow obligation reference.",
    body: (
      <Code lang="move">{`module flowpay::vault {
    public struct FlowVault has key { id: UID, owner: address, /* … */ }
    public entry fun deposit<T>(self: &mut FlowVault, coin: Coin<T>) { /* … */ }
    public entry fun withdraw<T>(self: &mut FlowVault, amount: u64) { /* … */ }
}`}</Code>
    ),
  },
  "contracts-router": {
    group: "Modules",
    title: "SmartRouter",
    intro:
      "Picks the optimal asset to source from your vault and exposes the routing seam DeepBook will fill.",
    body: (
      <Code lang="move">{`module flowpay::router {
    public fun pick_optimal(vault: &FlowVault, target_usd: u64): (TypeName, u64) { /* … */ }
    public fun route<In, Out>(funds: Coin<In>, min_out: u64): Coin<Out> { /* … */ }
}`}</Code>
    ),
  },
  "contracts-guard": {
    group: "Modules",
    title: "BorrowGuard",
    intro: "Pre-trade safety. Enforces LTV limits and rejects stale Pyth prices.",
    body: (
      <Code lang="move">{`module flowpay::guard {
    public fun check_health_factor(vault: &FlowVault, amount: u64) { /* … */ }
    public fun assert_oracle_fresh(feed_id: vector<u8>) { /* … */ }
}`}</Code>
    ),
  },
  "contracts-deployments": {
    group: "Modules",
    title: "Deployments",
    intro: "Live package and object IDs on Sui Testnet.",
    body: (
      <Callout type="tip">
        Packages will be published during the build phase. This page will list
        package IDs, FlowVault shared object IDs, and an Explorer link as soon
        as the first publish completes.
      </Callout>
    ),
  },

  // ── Integration ──────────────────────────────────────────────────────────
  quickstart: {
    group: "Integration",
    title: "Quickstart",
    intro: "Get a working FlowPay testnet wallet in five minutes.",
    body: (
      <>
        <H3>1. Install the Sui CLI</H3>
        <Code lang="bash">{`npm install -g @mysten/sui`}</Code>
        <H3>2. Switch to testnet</H3>
        <Code lang="bash">{`sui client switch --env testnet`}</Code>
        <H3>3. Fund your address from the faucet</H3>
        <Code lang="bash">{`sui client faucet`}</Code>
        <H3>4. Open the FlowPay PWA</H3>
        <P>Visit the deployed PWA, sign in with Google (zkLogin), and top up your FlowVault.</P>
      </>
    ),
  },
  "supported-assets": {
    group: "Integration",
    title: "Supported assets",
    intro: "The default basket on Sui Testnet.",
    body: (
      <>
        <Code lang="json">{`[
  { "symbol": "SUI",  "decimals": 9 },
  { "symbol": "USDC", "decimals": 6 },
  { "symbol": "BTC",  "decimals": 8, "bridge": "wormhole" },
  { "symbol": "ETH",  "decimals": 8, "bridge": "wormhole" }
]`}</Code>
        <Callout type="tip">
          New assets are added by registering a matching Scallop pool and a
          Pyth feed in the FlowVault config.
        </Callout>
      </>
    ),
  },
  network: {
    group: "Integration",
    title: "Network details",
    intro: "FlowPay targets Sui Testnet for the Sui Overflow 2026 submission.",
    body: (
      <Code lang="json">{`{
  "network": "Sui Testnet",
  "rpc": "https://fullnode.testnet.sui.io:443",
  "faucet": "https://faucet.testnet.sui.io/v2/gas",
  "explorer": "https://suiscan.xyz/testnet"
}`}</Code>
    ),
  },

  // ── Resources ────────────────────────────────────────────────────────────
  security: {
    group: "Resources",
    title: "Safety model",
    intro:
      "Four guardrails wrap every transaction: access control, oracle freshness, LTV ceilings, and emergency pause.",
    body: (
      <>
        <H2>Defence in depth</H2>
        <ul className="list-disc list-inside text-white/55 leading-relaxed space-y-2 mb-4">
          <li>Role-based access control on every entry function</li>
          <li>Pyth oracle staleness asserted before any borrow</li>
          <li>Conservative LTV (max 40%) on every spend</li>
          <li>Multisig-gated emergency pause + fail-safe withdrawals</li>
        </ul>
        <Callout type="warn">
          Disclosure: report vulnerabilities responsibly via{" "}
          <Link href="/security" className="underline">/security</Link>.
        </Callout>
      </>
    ),
  },
  faq: {
    group: "Resources",
    title: "FAQ",
    intro: "Common questions about FlowPay.",
    body: (
      <>
        <H3>Is FlowPay custodial?</H3>
        <P>No. Your FlowVault is a Sui object you own. No team key can move funds.</P>
        <H3>What happens if Scallop goes down?</H3>
        <P>The emergency pause halts new spends. You can withdraw deposits in fail-safe mode.</P>
        <H3>When does DeepBook land?</H3>
        <P>Next sprint. SmartRouter exposes the seam already.</P>
        <H3>Can I run it on mainnet?</H3>
        <P>Not yet. Audit + formal verification first. Testnet only for the hackathon.</P>
      </>
    ),
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default async function DocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <>
      <div className="mb-2">
        <span className="text-xs font-mono text-white/25 uppercase tracking-widest">
          {page.group}
        </span>
      </div>
      <h1 className="text-5xl lg:text-[56px] font-display tracking-tight leading-[0.92] mb-8 text-white">
        {page.title}
      </h1>
      <p className="text-white/55 leading-relaxed mb-8 text-lg">{page.intro}</p>
      {page.body}
      <div className="mt-14 pt-8 border-t border-white/[0.07] flex items-center justify-between text-xs text-white/20 font-mono">
        <Link href="/docs" className="hover:text-white/45 transition-colors">
          ← Back to overview
        </Link>
        <a
          href="https://github.com/flowpay/flowpay"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/45 transition-colors"
        >
          Edit on GitHub ↗
        </a>
      </div>
    </>
  );
}
