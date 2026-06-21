"use client";

import { ConnectButton, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

const MIST_PER_SUI = 1_000_000_000;

/** Format a MIST balance string into a short SUI amount. */
function formatSui(mist: string): string {
  const sui = Number(mist) / MIST_PER_SUI;
  if (sui === 0) return "0";
  if (sui < 0.001) return "<0.001";
  return sui.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

/**
 * Live on-chain wallet status. Reads the connected account's real testnet SUI
 * balance directly from the fullnode — this is genuine chain state, not the
 * seeded demo data.
 */
export function WalletStatus() {
  const account = useCurrentAccount();

  const { data, isPending, isError } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "" },
    { enabled: !!account, refetchInterval: 10_000 },
  );

  return (
    <div className="flex items-center gap-2.5">
      {account && (
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 font-mono text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[#CFFF03]" />
          {isError
            ? "balance unavailable"
            : isPending
              ? "loading…"
              : `${formatSui(data!.totalBalance)} SUI`}
          <span className="text-muted-foreground/40">· testnet</span>
        </span>
      )}
      <ConnectButton connectText="Connect wallet" />
    </div>
  );
}
