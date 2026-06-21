"use client";

import { useCallback, useMemo, useState } from "react";
import { ConnectButton, useCurrentAccount, useSignTransaction } from "@mysten/dapp-kit";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { AlertTriangle, ArrowRight, Check, ExternalLink, Loader2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TokenIcon } from "./token-icon";
import { useScallopApy } from "@/hooks/use-scallop-apy";

type Coin = "sui" | "usdc";
type Phase = "idle" | "building" | "signing" | "executing" | "done" | "error";

const PRESETS: Record<Coin, number[]> = {
  sui: [0.1, 0.25, 0.5],
  usdc: [1, 2, 5],
};

function mainnetExplorerTx(digest: string) {
  return `https://suiscan.xyz/mainnet/tx/${digest}`;
}

export function ScallopDeposit() {
  const account = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const scallop = useScallopApy();

  const mainnet = useMemo(
    () => new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" }),
    [],
  );

  const [coin, setCoin] = useState<Coin>("sui");
  const [amount, setAmount] = useState("0.1");
  const [phase, setPhase] = useState<Phase>("idle");
  const [digest, setDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const value = Math.max(0, parseFloat(amount) || 0);
  const apySymbol = coin === "sui" ? "SUI" : "USDC";
  const apy = scallop.rates[apySymbol];

  const deposit = useCallback(async () => {
    if (!account || value <= 0) return;
    setError(null);
    setDigest(null);
    try {
      // 1) Server builds the Scallop deposit PTB (Scallop SDK is server-only).
      setPhase("building");
      const res = await fetch("/api/scallop-deposit-tx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sender: account.address, coin, amount: value }),
      });
      const data = (await res.json()) as { txJson?: string; error?: string };
      if (!data.txJson) {
        throw new Error(
          data.error?.includes("coin") || data.error?.includes("balance")
            ? `No mainnet ${apySymbol} found in this wallet to deposit.`
            : (data.error ?? "Failed to build deposit transaction."),
        );
      }

      // 2) Reconstruct with @mysten/sui 2.x and resolve gas on mainnet.
      const tx = Transaction.from(data.txJson);
      const built = await tx.build({ client: mainnet });

      // 3) Wallet signs the fully-built mainnet tx.
      setPhase("signing");
      const { bytes, signature } = await signTransaction({
        transaction: Transaction.from(built),
        chain: "sui:mainnet",
      });

      // 4) Execute via our own mainnet client (keeps the app's testnet context intact).
      setPhase("executing");
      const result = await mainnet.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true },
      });
      if (result.effects?.status?.status !== "success") {
        throw new Error(result.effects?.status?.error ?? "Transaction did not succeed.");
      }
      setDigest(result.digest);
      setPhase("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [account, value, coin, amount, apySymbol, mainnet, signTransaction]);

  const busy = phase === "building" || phase === "signing" || phase === "executing";

  return (
    <div className="border border-emerald-400/30 bg-emerald-400/[0.03] rounded-xl p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-emerald-400">
            Earn real yield · Scallop
          </span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          Real · mainnet
        </span>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground mb-4">
        Supply an asset into Scallop&apos;s lending pool and start earning. Scallop is mainnet-only,
        so this moves <span className="text-amber-400">real funds</span> — use a small amount. Your
        deposit returns an interest-bearing sCoin you can withdraw anytime.
      </p>

      {!account ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Connect a Sui wallet (you&apos;ll approve on <span className="text-foreground">mainnet</span>).
          </p>
          <ConnectButton />
        </div>
      ) : (
        <>
          {/* Asset */}
          <label className="font-mono text-xs text-muted-foreground">Supply</label>
          <div className="mt-1 flex gap-1.5">
            {(["sui", "usdc"] as Coin[]).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCoin(c);
                  setAmount(String(PRESETS[c][0]));
                }}
                disabled={busy}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border font-mono text-xs transition-colors disabled:opacity-40 ${
                  coin === c
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400"
                    : "border-foreground/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                <TokenIcon symbol={c === "sui" ? "SUI" : "USDC"} size={16} />
                {c.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="mt-3 flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              className="bg-input/40 border-foreground/10 font-mono text-lg"
            />
            <div className="flex gap-1">
              {PRESETS[coin].map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-md border border-foreground/10 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Live APY */}
          <div className="mt-3 rounded-lg border border-foreground/10 bg-black/40 p-3 font-mono text-[11px]">
            {apy != null ? (
              <span className="text-muted-foreground">
                Earning{" "}
                <span className="text-emerald-400">{(apy * 100).toFixed(2)}% APY</span> on{" "}
                {apySymbol} · live Scallop mainnet supply rate
              </span>
            ) : (
              <span className="text-muted-foreground">Loading live Scallop rate…</span>
            )}
          </div>

          {phase !== "done" && (
            <Button
              onClick={deposit}
              disabled={value <= 0 || busy}
              className="mt-4 w-full h-12 rounded-full bg-emerald-400 text-black hover:bg-emerald-400/90 font-medium"
            >
              {phase === "building" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Building tx…
                </>
              )}
              {phase === "signing" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Approve on mainnet…
                </>
              )}
              {phase === "executing" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                </>
              )}
              {(phase === "idle" || phase === "error") && (
                <>
                  Supply {value || 0} {apySymbol} to Scallop <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}

          {phase === "error" && error && (
            <p className="mt-3 font-mono text-[11px] text-destructive break-words">{error}</p>
          )}

          {phase === "done" && digest && (
            <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4" />
                <span className="font-mono text-sm">Supplied — your {apySymbol} is now earning</span>
              </div>
              <a
                href={mainnetExplorerTx(digest)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 underline break-all"
              >
                {digest.slice(0, 12)}…{digest.slice(-6)}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                Real transaction on Sui mainnet. The sCoin in your wallet accrues yield until you
                withdraw.
              </p>
              <Button
                onClick={() => setPhase("idle")}
                variant="outline"
                className="mt-3 w-full h-9 rounded-full border-foreground/20 font-mono text-xs"
              >
                Supply more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
