import { notFound } from "next/navigation";
import Link from "next/link";
import { Callout, Code, H2, H3, P } from "../_components/shared";

type PageDef = {
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
};

const pages: Record<string, PageDef> = {
  usecases: {
    eyebrow: "Overview",
    title: <>Use cases</>,
    body: (
      <>
        <P>
          Vela exists because selling shares to access liquidity is one of the most expensive
          decisions a retail or institutional holder can make. You realise tax. You exit the
          rally. You pay the brokerage spread. Vela replaces that decision with a borrow.
        </P>

        <H2>1. Personal liquidity without exit</H2>
        <P>
          You hold $20,000 of tokenized TSLA. You need $5,000 in stablecoin for a real-world
          expense or a different onchain opportunity. Sell, pay capital gains, miss the next
          earnings beat. With Vela: deposit, borrow 5,000 USDG at the prevailing rate, repay
          when convenient.
        </P>

        <H2>2. Treasury layer for DAOs and funds</H2>
        <P>
          A DAO treasury holds AMZN and AMD as part of a balanced book. Operating expenses
          are USDG. Instead of selling and rebuying, the treasury opens a permanent Vela line
          and draws it down for payroll, paying it back from incoming fees.
        </P>

        <H2>3. Composable building block</H2>
        <P>
          Any product on Robinhood Chain — a brokerage front-end, a wallet, an aggregator —
          can wrap Vela&apos;s pool to offer instant USDG liquidity to its users. Vela charges
          a transparent reserve factor on every borrow; the partner keeps the relationship.
        </P>

        <Callout type="tip">
          The protocol is asset-agnostic by design. As Robinhood Chain expands the whitelisted
          equity set, Vela inherits new collateral with a parameter update — no contract
          migration required.
        </Callout>
      </>
    ),
  },

  architecture: {
    eyebrow: "Overview",
    title: <>Architecture</>,
    body: (
      <>
        <P>
          Vela is four small components that don&apos;t trust each other. Each is independently
          auditable and replaceable.
        </P>

        <H2>1. CollateralVault</H2>
        <P>
          Holds tokenized stocks on behalf of borrowers. Tracks per-user balances per asset.
          Emits <code className="font-mono text-[#B6E324]">Deposit</code> and{" "}
          <code className="font-mono text-[#B6E324]">Withdraw</code> events that downstream
          systems index. Withdrawals require the LendingPool to confirm the position remains
          solvent.
        </P>

        <H2>2. LendingPool</H2>
        <P>
          USDG supply and borrow market. Implements an interest-rate curve (kink-based, à la
          Aave) and tracks borrow/supply indexes. Charges a reserve factor (default 10%) on
          interest accrual and routes it to the protocol treasury.
        </P>

        <H2>3. OracleAdapter</H2>
        <P>
          Per-asset signed price feeds. On testnet, prices are pushed by a relayer service.
          On mainnet, the intent is to plug into the chain&apos;s canonical equity oracle once
          available. Heartbeat + max-deviation thresholds invalidate stale or anomalous prices.
        </P>

        <H2>4. Helmsman Agent</H2>
        <P>
          Off-chain process that watches every open position. Combines realized volatility,
          implied volatility from option markets, and event calendar (earnings, ex-div) to
          compute a forward-looking risk score. Pings users with the smallest possible
          corrective action and only escalates to onchain liquidation when ignored.
        </P>

        <Callout type="info">
          The Helmsman is permissionless to run — anyone can host their own and earn keeper
          fees on liquidations. The reference implementation is open source.
        </Callout>
      </>
    ),
  },

  collateral: {
    eyebrow: "Protocol",
    title: <>Collateral &amp; LTV</>,
    body: (
      <>
        <P>
          Each whitelisted asset carries its own <strong className="text-white/80">loan-to-value</strong>{" "}
          (LTV) and <strong className="text-white/80">liquidation threshold</strong>, calibrated to
          its 30-day realized volatility. More volatile names borrow less.
        </P>

        <H2>Current parameters (testnet)</H2>
        <div className="overflow-x-auto my-6">
          <table className="w-full text-sm font-mono border border-white/10">
            <thead className="bg-white/[0.04]">
              <tr className="text-white/55">
                <th className="text-left p-3 font-normal">Asset</th>
                <th className="text-left p-3 font-normal">Max LTV</th>
                <th className="text-left p-3 font-normal">Liquidation @</th>
                <th className="text-left p-3 font-normal">Reserve factor</th>
              </tr>
            </thead>
            <tbody className="text-white/65">
              {[
                ["TSLA", "45%", "55%", "10%"],
                ["AMZN", "55%", "65%", "10%"],
                ["PLTR", "35%", "45%", "12%"],
                ["NFLX", "50%", "60%", "10%"],
                ["AMD", "45%", "55%", "10%"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-white/[0.06]">
                  {r.map((c, i) => (
                    <td key={i} className="p-3">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H2>Health factor</H2>
        <P>
          Every position has a health factor, computed as{" "}
          <code className="font-mono text-[#B6E324]">collateralValue × liqThreshold / debt</code>.
          Above 1.0 you&apos;re safe. Below 1.0 you&apos;re liquidatable.
        </P>

        <Code lang="solidity">{`function healthFactor(address user) public view returns (uint256) {
    uint256 cv = collateralValueUSDG(user);          // 18-decimals
    uint256 dv = debtUSDG(user);                     // 18-decimals
    uint256 lt = weightedLiquidationThreshold(user); // 1e4 = 100%
    return dv == 0 ? type(uint256).max : (cv * lt) / (dv * 1e4);
}`}</Code>
      </>
    ),
  },

  borrow: {
    eyebrow: "Protocol",
    title: <>Borrowing USDG</>,
    body: (
      <>
        <P>
          Borrowing is a single transaction once you have collateral deposited. The pool
          checks your remaining capacity, mints debt indexed against the global borrow rate,
          and transfers USDG to your wallet.
        </P>

        <Code>{`// 1. Make sure you have collateral
await vault.deposit(TSLA, 10n * 10n ** 18n);

// 2. Borrow up to your capacity
await pool.borrow(3_000n * 10n ** 6n);

// 3. USDG arrives in your wallet
const bal = await usdg.balanceOf(me);`}</Code>

        <H2>Interest accrual</H2>
        <P>
          Interest accrues per-second on a borrow index. The index updates lazily on every
          mutating call — there is no off-chain process required for interest to apply
          correctly to outstanding debt.
        </P>

        <H2>Rate model</H2>
        <P>
          Two-slope kinked rate: a base rate that climbs slowly until utilization passes the
          kink (default 80%), after which the rate steepens sharply to incentivise repayment
          or new supply.
        </P>

        <Callout type="info">
          For the buildathon demo, the kink is 80% and the steep slope is 60% APR — strong
          enough to demonstrate rate response without spending hours waiting for the curve
          to bite.
        </Callout>
      </>
    ),
  },

  repay: {
    eyebrow: "Protocol",
    title: <>Repay &amp; withdraw</>,
    body: (
      <>
        <P>
          Repayment is partial or full. Withdrawals are gated on the resulting health
          factor — you can always pull collateral while you&apos;re solvent.
        </P>

        <Code>{`// Repay 1,000 USDG
await usdg.approve(POOL, 1_000n * 10n ** 6n);
await pool.repay(1_000n * 10n ** 6n);

// Withdraw 5 TSLA back to your wallet
await vault.withdraw(TSLA, 5n * 10n ** 18n);`}</Code>

        <P>
          If you try to withdraw an amount that would drop your health factor below 1.0, the
          call reverts with <code className="font-mono text-[#B6E324]">InsufficientCollateral()</code>.
          Repay more first, or withdraw less.
        </P>
      </>
    ),
  },

  liquidations: {
    eyebrow: "Protocol",
    title: <>Liquidations</>,
    body: (
      <>
        <P>
          Liquidations are designed to be a last resort, not a revenue engine. The protocol
          attempts soft liquidation first — partial repayment with a small bonus — before
          falling back to full liquidation.
        </P>

        <H2>Trigger</H2>
        <P>
          A position becomes liquidatable when its health factor crosses below 1.0. The
          Helmsman agent pre-warns the user multiple times before this threshold is reached.
        </P>

        <H2>Soft liquidation</H2>
        <P>
          A keeper (anyone) repays up to <strong className="text-white/80">close factor</strong>{" "}
          (default 50%) of the debt and receives the equivalent in collateral plus a 5%
          bonus. This restores health and gives the user a chance to recover.
        </P>

        <H2>Full liquidation</H2>
        <P>
          If health falls past a secondary threshold (default 0.92), keepers can repay 100%
          and seize all collateral with a 7% bonus. This protects pool solvency.
        </P>

        <Callout type="warn">
          The bonus comes out of the borrower&apos;s collateral. Healthy positions never pay
          this cost. The Helmsman&apos;s entire purpose is to prevent borrowers from ever
          paying it.
        </Callout>
      </>
    ),
  },

  "interest-model": {
    eyebrow: "Protocol",
    title: <>Interest model</>,
    body: (
      <>
        <P>
          Vela uses a standard two-slope kinked interest rate curve. The protocol distributes
          the borrow rate between USDG suppliers and the reserve, governed by the per-asset
          reserve factor.
        </P>

        <Code lang="solidity">{`function borrowRate(uint256 util) public pure returns (uint256) {
    if (util <= KINK) {
        return BASE + (util * SLOPE_1) / KINK;
    } else {
        uint256 over = util - KINK;
        return BASE + SLOPE_1 + (over * SLOPE_2) / (1e18 - KINK);
    }
}

function supplyRate(uint256 util, uint256 reserveFactor) external view returns (uint256) {
    uint256 br = borrowRate(util);
    return (br * util * (1e4 - reserveFactor)) / 1e4 / 1e18;
}`}</Code>

        <H3>Default parameters</H3>
        <P>
          <code className="font-mono text-[#B6E324]">BASE = 1%</code>,{" "}
          <code className="font-mono text-[#B6E324]">SLOPE_1 = 6%</code>,{" "}
          <code className="font-mono text-[#B6E324]">SLOPE_2 = 60%</code>,{" "}
          <code className="font-mono text-[#B6E324]">KINK = 80%</code>.
        </P>
      </>
    ),
  },

  oracle: {
    eyebrow: "Protocol",
    title: <>Price oracle</>,
    body: (
      <>
        <P>
          The OracleAdapter provides USD-quoted prices for every whitelisted asset. On
          testnet, prices are pushed by a relayer service and cross-checked against a TWAP
          of the most recent on-chain swaps where available.
        </P>

        <H2>Safety bounds</H2>
        <P>
          Every price update has a <strong className="text-white/80">heartbeat</strong> (max
          staleness, default 60s) and a <strong className="text-white/80">max deviation</strong>{" "}
          (default 8%) versus the prior accepted price. Updates outside these bounds are
          quarantined and require operator review.
        </P>

        <Callout type="warn">
          On mainnet, the goal is to plug into Robinhood Chain&apos;s canonical equity oracle
          once published. Until then, all positions assume the relayer-fed oracle is honest;
          the design space for a permissionless oracle is open.
        </Callout>
      </>
    ),
  },

  "agent-overview": {
    eyebrow: "Agent",
    title: <>Helmsman overview</>,
    body: (
      <>
        <P>
          The Helmsman is Vela&apos;s autonomous risk manager. It runs off-chain, watches
          every open position, and intervenes long before a margin call becomes necessary.
        </P>

        <H2>Inputs</H2>
        <ul className="list-disc pl-5 my-4 text-white/55 space-y-1">
          <li>Realized volatility (rolling 7d / 30d) per asset</li>
          <li>Implied volatility from option markets</li>
          <li>Event calendar — earnings, ex-dividend, scheduled news</li>
          <li>Liquidity depth across DEX venues</li>
          <li>Position-level health factor and time-since-update</li>
        </ul>

        <H2>Outputs</H2>
        <ul className="list-disc pl-5 my-4 text-white/55 space-y-1">
          <li>Forward-looking risk score per position</li>
          <li>Smallest corrective action (repay X, top up Y)</li>
          <li>User-facing alerts (push, webhook, email)</li>
          <li>Permissionless soft-liquidation calls when ignored</li>
        </ul>

        <Callout type="tip">
          The Helmsman is one process today; the design supports many independent helmsmen
          competing on alert quality and keeper revenue.
        </Callout>
      </>
    ),
  },

  "agent-risk": {
    eyebrow: "Agent",
    title: <>Risk monitoring</>,
    body: (
      <>
        <P>
          The Helmsman computes a forward-looking <strong className="text-white/80">risk score</strong>{" "}
          (0–100) for every position every block. The score blends current health factor
          with projected stress under realistic price moves.
        </P>

        <Code lang="python">{`def risk_score(position):
    # current cushion
    hf = position.health_factor()

    # forward stress: 1-day 2-sigma move on weighted collateral
    sigma = blended_vol(position.collateral_basket)
    stress_hf = (position.collateral_value * (1 - 2*sigma) *
                 position.liq_threshold) / position.debt

    # event adjustment: pulled-in days to nearest catalyst
    days_to_event = nearest_event(position.collateral_basket)
    event_mult = 1 - 0.6 * exp(-days_to_event / 3)

    return clamp_0_100(blend(hf, stress_hf, event_mult))`}</Code>
      </>
    ),
  },

  "agent-actions": {
    eyebrow: "Agent",
    title: <>Protective actions</>,
    body: (
      <>
        <P>
          When the risk score crosses thresholds, the Helmsman takes graduated action:
        </P>

        <div className="space-y-3 my-6">
          {[
            { score: "≥ 70", label: "Healthy — no action" },
            { score: "55–70", label: "Yellow — daily summary ping" },
            { score: "40–55", label: "Orange — immediate alert with suggested top-up or partial repay" },
            { score: "25–40", label: "Red — repeated alerts every 5 minutes; pre-position liquidation calldata" },
            { score: "< 25", label: "Critical — call soft-liquidate as soon as profitable" },
          ].map((b) => (
            <div key={b.score} className="flex gap-4 p-4 border border-white/[0.07]">
              <span className="font-mono text-sm text-[#B6E324] shrink-0 w-20">{b.score}</span>
              <span className="text-sm text-white/65">{b.label}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },

  "contracts-overview": {
    eyebrow: "Contracts",
    title: <>Contracts overview</>,
    body: (
      <>
        <P>
          Vela ships three core contracts plus a small set of adapters. All contracts are
          verified on Robinhood Chain Testnet and the source lives under{" "}
          <code className="font-mono text-[#B6E324]">contracts/</code> in the monorepo.
        </P>

        <div className="grid md:grid-cols-3 gap-4 my-8">
          {[
            { name: "LendingPool", href: "/contracts-pool", body: "USDG market, borrow/repay, rate accrual" },
            { name: "CollateralVault", href: "/contracts-vault", body: "Per-asset deposits, gated withdrawals" },
            { name: "Liquidator", href: "/contracts-liquidator", body: "Soft & full liquidation entry points" },
          ].map((c) => (
            <Link
              key={c.name}
              href={c.href}
              className="border border-white/[0.08] p-5 hover:border-[#B6E324]/30 hover:bg-[#B6E324]/[0.03] transition-colors group"
            >
              <h3 className="font-medium mb-2 text-white group-hover:text-[#B6E324] transition-colors">
                {c.name}
              </h3>
              <p className="text-sm text-white/45 leading-relaxed">{c.body}</p>
            </Link>
          ))}
        </div>

        <H2>Adapters</H2>
        <ul className="list-disc pl-5 my-4 text-white/55 space-y-1">
          <li><strong className="text-white/80">OracleAdapter</strong> — relayer-pushed price feeds</li>
          <li><strong className="text-white/80">InterestRateModel</strong> — two-slope kinked curve</li>
          <li><strong className="text-white/80">AssetConfig</strong> — per-asset LTV, threshold, reserve factor</li>
        </ul>
      </>
    ),
  },

  "contracts-pool": {
    eyebrow: "Contracts",
    title: <>LendingPool</>,
    body: (
      <>
        <P>
          The USDG supply/borrow market. Tracks utilisation, accrues interest, and exposes
          the borrow and repay entry points used by depositors of any whitelisted collateral.
        </P>

        <Code lang="solidity">{`interface ILendingPool {
    function supply(uint256 amount) external;
    function withdraw(uint256 amount) external returns (uint256);

    function borrow(uint256 amount) external;
    function repay(uint256 amount) external returns (uint256);

    function borrowIndex() external view returns (uint256);
    function supplyIndex() external view returns (uint256);

    function utilization() external view returns (uint256);
    function borrowRate() external view returns (uint256);
    function supplyRate() external view returns (uint256);
}`}</Code>
      </>
    ),
  },

  "contracts-vault": {
    eyebrow: "Contracts",
    title: <>CollateralVault</>,
    body: (
      <>
        <P>
          Holds tokenized stocks on behalf of borrowers. Per-asset, per-user accounting.
          Withdrawals must succeed against the LendingPool&apos;s solvency check.
        </P>

        <Code lang="solidity">{`interface ICollateralVault {
    function deposit(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;

    function balanceOf(address user, address asset) external view returns (uint256);
    function collateralValueUSDG(address user) external view returns (uint256);

    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
}`}</Code>
      </>
    ),
  },

  "contracts-liquidator": {
    eyebrow: "Contracts",
    title: <>Liquidator</>,
    body: (
      <>
        <P>
          The keeper entry point for liquidating undercollateralized positions. Two modes:
          soft (partial) and full.
        </P>

        <Code lang="solidity">{`interface ILiquidator {
    /// @notice Repay up to closeFactor of debt, receive collateral + bonus.
    function softLiquidate(address borrower, address collateralAsset, uint256 repayAmount)
        external returns (uint256 seized);

    /// @notice Repay 100% of debt, seize all collateral + larger bonus. Health must be < 0.92.
    function fullLiquidate(address borrower)
        external returns (uint256 totalSeized);
}`}</Code>
      </>
    ),
  },

  "contracts-deployments": {
    eyebrow: "Contracts",
    title: <>Deployments</>,
    body: (
      <>
        <P>All addresses on Robinhood Chain Testnet (chain ID 46630).</P>

        <H3>Vela protocol</H3>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm font-mono border border-white/10">
            <tbody className="text-white/65">
              {[
                ["LendingPool", "0xVE1A…coming soon"],
                ["CollateralVault", "0xVE1A…coming soon"],
                ["Liquidator", "0xVE1A…coming soon"],
                ["OracleAdapter", "0xVE1A…coming soon"],
                ["AssetConfig", "0xVE1A…coming soon"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-white/[0.06]">
                  <td className="p-3 text-white/85">{r[0]}</td>
                  <td className="p-3">{r[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H3>External tokens used</H3>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm font-mono border border-white/10">
            <tbody className="text-white/65">
              {[
                ["USDG", "0x7E955252E15c84f5768B83c41a71F9eba181802F"],
                ["WETH", "0x7943e237c7F95DA44E0301572D358911207852Fa"],
                ["TSLA", "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E"],
                ["AMZN", "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02"],
                ["PLTR", "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0"],
                ["NFLX", "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93"],
                ["AMD", "0x71178BAc73cBeb415514eB542a8995b82669778d"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-white/[0.06]">
                  <td className="p-3 text-white/85">{r[0]}</td>
                  <td className="p-3">{r[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Callout type="info">
          Vela protocol contracts are deployed at the end of every buildathon-day commit
          and the table above is regenerated automatically. Refresh after the next deploy
          for live addresses.
        </Callout>
      </>
    ),
  },

  quickstart: {
    eyebrow: "Integration",
    title: <>Quickstart</>,
    body: (
      <>
        <P>
          Open your first credit line in five minutes. You will need an EVM wallet, some
          testnet ETH for gas, and a testnet USDG balance from the Paxos faucet.
        </P>

        <H2>1. Add the network</H2>
        <P>
          See <Link href="/docs/network" className="underline">Network details</Link> for one-click
          MetaMask configuration.
        </P>

        <H2>2. Fund your wallet</H2>
        <P>
          ETH for gas comes from the Robinhood Chain faucet. USDG for testing borrows comes
          from the Paxos faucet — select USDG, set the network to Robinhood Chain Testnet,
          enter your address, send 100 tokens.
        </P>

        <H2>3. Deposit and borrow</H2>
        <Code>{`import { createWalletClient, custom } from "viem";
import { vela, TSLA } from "@vela/sdk";

const wallet = createWalletClient({
  chain: vela.chains.robinhoodTestnet,
  transport: custom(window.ethereum),
});

// 10 TSLA in, 3,000 USDG out
await vela.deposit({ wallet, asset: TSLA, amount: 10n * 10n ** 18n });
await vela.borrow({ wallet, amount: 3_000n * 10n ** 6n });`}</Code>
      </>
    ),
  },

  "supported-assets": {
    eyebrow: "Integration",
    title: <>Supported assets</>,
    body: (
      <>
        <P>
          Five tokenized stocks are live on Robinhood Chain Testnet at launch. The borrow
          asset is USDG (Paxos&apos; Global Dollar).
        </P>

        <div className="overflow-x-auto my-6">
          <table className="w-full text-sm font-mono border border-white/10">
            <thead className="bg-white/[0.04]">
              <tr className="text-white/55">
                <th className="text-left p-3 font-normal">Symbol</th>
                <th className="text-left p-3 font-normal">Address</th>
                <th className="text-left p-3 font-normal">Role</th>
              </tr>
            </thead>
            <tbody className="text-white/65">
              {[
                ["USDG", "0x7E955252E15c84f5768B83c41a71F9eba181802F", "Borrow asset"],
                ["TSLA", "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E", "Collateral"],
                ["AMZN", "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02", "Collateral"],
                ["PLTR", "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0", "Collateral"],
                ["NFLX", "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93", "Collateral"],
                ["AMD", "0x71178BAc73cBeb415514eB542a8995b82669778d", "Collateral"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-white/[0.06]">
                  <td className="p-3 text-white/85">{r[0]}</td>
                  <td className="p-3 text-xs">{r[1]}</td>
                  <td className="p-3">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },

  network: {
    eyebrow: "Integration",
    title: <>Network details</>,
    body: (
      <>
        <P>
          Vela runs on Robinhood Chain Testnet, an Arbitrum-Orbit L2 maintained by
          Robinhood. Wallet support and faucets are linked below.
        </P>

        <H2>Add to MetaMask</H2>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm font-mono border border-white/10">
            <tbody className="text-white/65">
              {[
                ["Network Name", "Robinhood Chain Testnet"],
                ["Chain ID", "46630"],
                ["RPC URL", "https://rpc.testnet.chain.robinhood.com"],
                ["Currency Symbol", "ETH"],
                ["Block Explorer", "https://explorer.testnet.chain.robinhood.com"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-white/[0.06]">
                  <td className="p-3 text-white/85 w-1/3">{r[0]}</td>
                  <td className="p-3">{r[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H2>Faucets</H2>
        <ul className="list-disc pl-5 my-4 text-white/55 space-y-2">
          <li>
            <strong className="text-white/80">ETH (gas):</strong> Robinhood Chain&apos;s
            faucet page — opens a wallet drip flow.
          </li>
          <li>
            <strong className="text-white/80">USDG:</strong> Paxos faucet — select USDG,
            ensure network is Robinhood Chain Testnet, enter address, send 100 tokens.
          </li>
        </ul>

        <H2>Wallets</H2>
        <P>
          Robinhood Wallet (iOS / Android, enable in Settings → Developer Settings) plus
          all standard EVM wallets: MetaMask, Phantom, Backpack, HaHa, SubWallet, Nightly.
        </P>
      </>
    ),
  },

  security: {
    eyebrow: "Resources",
    title: <>Security model</>,
    body: (
      <>
        <P>
          Vela aims for the smallest possible trust surface compatible with shipping a
          working credit market today.
        </P>

        <H2>What is trustless</H2>
        <ul className="list-disc pl-5 my-4 text-white/55 space-y-1">
          <li>Collateral custody — vault contract is non-upgradeable on mainnet</li>
          <li>Solvency checks — enforced in-protocol, no offchain dependency</li>
          <li>Interest accrual — fully onchain, no oracle for rates</li>
        </ul>

        <H2>What is trusted (today)</H2>
        <ul className="list-disc pl-5 my-4 text-white/55 space-y-1">
          <li>Oracle relayer — feeds USD prices for the five whitelisted assets</li>
          <li>Asset whitelist owner — adds/removes assets and tunes per-asset risk params</li>
          <li>Helmsman alerts — anyone can run one; the reference instance is operated by the team for testnet</li>
        </ul>

        <Callout type="warn">
          On mainnet the asset config owner becomes a timelocked multisig with a 48h delay,
          and the oracle is intended to migrate to the chain&apos;s canonical equity feed
          once published. Until then, treat collateral whitelist changes as carrying
          governance risk.
        </Callout>
      </>
    ),
  },

  faq: {
    eyebrow: "Resources",
    title: <>FAQ</>,
    body: (
      <>
        <H3>Why borrow USDG against stock instead of just selling?</H3>
        <P>
          You keep the upside on your stock, you don&apos;t realise capital gains, and you
          re-open the position whenever you want by repaying. In TradFi this is called
          securities-based lending and it is a $700B market.
        </P>

        <H3>What happens if my stock crashes overnight?</H3>
        <P>
          The Helmsman alerts you continuously. If you ignore it and the position passes
          the liquidation threshold, a keeper repays part of your debt and seizes equivalent
          collateral plus a small bonus. The bonus is the cost of inaction — healthy
          positions never pay it.
        </P>

        <H3>Do I keep voting / dividend rights?</H3>
        <P>
          On testnet the tokens are wrapped representations without those rights. The
          intent on mainnet is that the CollateralVault forwards dividends and votes to the
          original depositor unless the position is in liquidation.
        </P>

        <H3>How is this different from MakerDAO or Aave?</H3>
        <P>
          The shape is similar — collateralised debt — but the collateral class is
          fundamentally different. Equities have earnings calendars, after-hours moves and
          option-implied volatility, none of which crypto-collateral protocols model. Vela
          is built around those signals from day one through the Helmsman.
        </P>
      </>
    ),
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export default async function DocsSlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();

  return (
    <>
      <div className="mb-2">
        <span className="text-xs font-mono text-white/25 uppercase tracking-widest">
          {page.eyebrow}
        </span>
      </div>
      <h1 className="text-5xl lg:text-[56px] font-display tracking-tight leading-[0.92] mb-10 text-white">
        {page.title}
      </h1>
      {page.body}

      <div className="mt-14 pt-8 border-t border-white/[0.07] flex items-center justify-between text-xs text-white/20 font-mono">
        <Link href="/docs/docs" className="hover:text-white/45 transition-colors">
          ← Back to overview
        </Link>
        <a
          href="https://github.com/vela-protocol/vela/tree/main/docs/app/%5Bslug%5D/page.tsx"
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
