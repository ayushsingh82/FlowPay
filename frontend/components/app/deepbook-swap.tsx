"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { ArrowRight, Check, ExternalLink, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeepTokenIcon, TokenIcon } from "./token-icon";
import {
  buildSuiToDeepSwapTx,
  buildSuiToUsdcSwapTx,
  explorerTxUrl,
  FAUCET_URL,
  quoteSuiToDeep,
  quoteSuiToUsdc,
} from "@/lib/deepbook";

type Route = "USDC" | "DEEP";
type Phase = "idle" | "signing" | "done" | "error";

// Generous slippage guard: testnet books are thin, so accept up to 30% worse
// than the live quote rather than revert on a small book move mid-flight.
const SLIPPAGE = 0.3;
const PRESETS = [0.25, 0.5, 1];

interface QuoteState {
  out: number; // DBUSDC (USDC route) or DEEP (DEEP route)
  deepOut: number; // intermediate DEEP for the USDC route
  rate: number;
}

export function DeepBookSwap() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [amount, setAmount] = useState("0.5");
  const [route, setRoute] = useState<Route>("USDC");

  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [digest, setDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suiIn = Math.max(0, parseFloat(amount) || 0);
  const reqId = useRef(0);

  // Live quote, debounced, with stale-response guarding.
  useEffect(() => {
    if (suiIn <= 0) {
      setQuote(null);
      setQuoteErr(null);
      return;
    }
    const id = ++reqId.current;
    setQuoting(true);
    setQuoteErr(null);
    const t = setTimeout(async () => {
      try {
        if (route === "USDC") {
          const q = await quoteSuiToUsdc(suiIn);
          if (id !== reqId.current) return;
          setQuote({ out: q.usdcOut, deepOut: q.deepOut, rate: q.rateUsdcPerSui });
        } else {
          const q = await quoteSuiToDeep(suiIn);
          if (id !== reqId.current) return;
          setQuote({ out: q.deepOut, deepOut: q.deepOut, rate: q.rateDeepPerSui });
        }
        setQuoteErr(null);
      } catch {
        if (id !== reqId.current) return;
        setQuote(null);
        setQuoteErr(
          route === "USDC"
            ? "No live route for this size — try 0.5 SUI, or switch to DEEP."
            : "Couldn't read a live quote — testnet RPC may be busy. Retry.",
        );
      } finally {
        if (id === reqId.current) setQuoting(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [suiIn, route]);

  const outSymbol = route === "USDC" ? "USDC" : "DEEP";
  const minOut = quote ? quote.out * (1 - SLIPPAGE) : 0;

  const swap = useCallback(async () => {
    if (!account || !quote || suiIn <= 0) return;
    setPhase("signing");
    setError(null);
    setDigest(null);
    try {
      const tx =
        route === "USDC"
          ? buildSuiToUsdcSwapTx({ suiIn, minUsdcOut: minOut, sender: account.address })
          : buildSuiToDeepSwapTx({ suiIn, minDeepOut: minOut, sender: account.address });
      const res = await signAndExecute({ transaction: tx, chain: "sui:testnet" });
      setDigest(res.digest);
      setPhase("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [account, quote, suiIn, minOut, route, signAndExecute]);

  function reset() {
    setPhase("idle");
    setDigest(null);
    setError(null);
  }

  return (
    <div className="border border-[#CFFF03]/30 bg-[#CFFF03]/[0.03] rounded-xl p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#CFFF03]" />
          <span className="font-mono text-xs uppercase tracking-wider text-[#CFFF03]">
            Live DeepBook swap
          </span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Real · testnet
        </span>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground mb-5">
        A real on-chain swap routed through DeepBook v3&apos;s live order book. Signed by your
        wallet, settled on Sui testnet.
      </p>

      {!account ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Connect a Sui wallet on <span className="text-foreground">testnet</span> to run a real
            swap.
          </p>
          <ConnectButton />
          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-muted-foreground/70 underline hover:text-[#CFFF03]"
          >
            Need testnet SUI? Use the faucet →
          </a>
        </div>
      ) : (
        <>
          {/* Amount */}
          <label className="font-mono text-xs text-muted-foreground">You pay (SUI)</label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={phase === "signing"}
              className="bg-input/40 border-foreground/10 font-mono text-lg"
            />
            <div className="flex gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  disabled={phase === "signing"}
                  className="px-2.5 py-1 rounded-md border border-foreground/10 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Route / output token */}
          <label className="font-mono text-xs text-muted-foreground mt-4 block">You receive</label>
          <div className="mt-1 flex gap-1.5">
            {(["USDC", "DEEP"] as Route[]).map((r) => (
              <button
                key={r}
                onClick={() => setRoute(r)}
                disabled={phase === "signing"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border font-mono text-xs transition-colors disabled:opacity-40 ${
                  route === r
                    ? "border-[#CFFF03]/50 bg-[#CFFF03]/10 text-[#CFFF03]"
                    : "border-foreground/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "USDC" ? <TokenIcon symbol="USDC" size={16} /> : <DeepTokenIcon size={16} />}
                {r}
              </button>
            ))}
          </div>

          {/* Quote */}
          <div className="mt-4 rounded-lg border border-foreground/10 bg-black/40 p-4">
            {quoting ? (
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> reading live order book…
              </span>
            ) : quoteErr ? (
              <span className="font-mono text-xs text-amber-400">{quoteErr}</span>
            ) : quote ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Estimated receive
                  </span>
                  <span className="font-mono text-lg text-foreground">
                    {quote.out.toLocaleString(undefined, { maximumFractionDigits: 4 })} {outSymbol}
                  </span>
                </div>
                <div className="mt-2 font-mono text-[11px] text-muted-foreground/80 leading-relaxed">
                  {route === "USDC" ? (
                    <>
                      Routed{" "}
                      <span className="text-[#CFFF03]">SUI → DEEP → USDC</span> through two
                      whitelisted DeepBook pools · 0 DEEP fee
                    </>
                  ) : (
                    <>
                      Routed <span className="text-[#CFFF03]">SUI → DEEP</span> on the DEEP_SUI pool ·
                      0 DEEP fee
                    </>
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground/60">
                  min received {minOut.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                  {outSymbol} · {(SLIPPAGE * 100).toFixed(0)}% slippage guard
                </div>
              </>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">Enter an amount.</span>
            )}
          </div>

          {/* Action */}
          {phase !== "done" && (
            <Button
              onClick={swap}
              disabled={!quote || quoting || phase === "signing"}
              className="mt-4 w-full h-12 rounded-full bg-[#CFFF03] text-black hover:bg-[#CFFF03]/90 font-medium"
            >
              {phase === "signing" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet…
                </>
              ) : (
                <>
                  Swap {suiIn || 0} SUI on DeepBook <ArrowRight className="w-4 h-4" />
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
                <span className="font-mono text-sm">Swapped on-chain</span>
              </div>
              <a
                href={explorerTxUrl(digest)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-[#CFFF03] underline break-all"
              >
                {digest.slice(0, 12)}…{digest.slice(-6)}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                Verify the transaction on Suiscan testnet.
              </p>
              <Button
                onClick={reset}
                variant="outline"
                className="mt-3 w-full h-9 rounded-full border-foreground/20 font-mono text-xs"
              >
                New swap
              </Button>
            </div>
          )}

          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-center font-mono text-[10px] text-muted-foreground/50 underline hover:text-[#CFFF03]"
          >
            Need testnet SUI? Use the faucet →
          </a>
        </>
      )}
    </div>
  );
}
