// Real DeepBook v3 integration on Sui testnet.
//
// This is NOT a simulation. It builds a wallet-signable Programmable Transaction
// Block (PTB) that routes a payment through DeepBook's live on-chain order book,
// and reads live executable quotes from the same pools.
//
// Route: SUI -> DEEP -> DBUSDC, hopping through two pools that are *whitelisted*
// on testnet (DEEP_SUI and DEEP_DBUSDC). Whitelisted pools charge zero protocol
// fee and require no DEEP, so a wallet funded only from the public Sui faucet can
// execute the whole route — no pre-acquired DEEP, no BalanceManager setup.
//
// Verified against testnet on 2026-06-21:
//   1 SUI -> ~20 DEEP -> ~0.33 DBUSDC, deepRequired = 0 on both hops.

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { DeepBookClient } from "@mysten/deepbook-v3";

export const DEEPBOOK_NETWORK = "testnet" as const;

// A throwaway address is fine for read-only quotes; the real sender is set per-tx.
const READONLY_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// Both whitelisted on testnet => zero DEEP fee.
const POOL_DEEP_SUI = "DEEP_SUI"; //   base DEEP / quote SUI
const POOL_DEEP_DBUSDC = "DEEP_DBUSDC"; // base DEEP / quote DBUSDC

export const FAUCET_URL = "https://faucet.sui.io/?network=testnet";

export function explorerTxUrl(digest: string): string {
  return `https://suiscan.xyz/testnet/tx/${digest}`;
}

let _client: DeepBookClient | null = null;
function readClient(): DeepBookClient {
  if (_client) return _client;
  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl(DEEPBOOK_NETWORK),
    network: DEEPBOOK_NETWORK,
  });
  _client = new DeepBookClient({
    client,
    address: READONLY_ADDRESS,
    network: DEEPBOOK_NETWORK,
  });
  return _client;
}

export interface SwapQuote {
  /** SUI the user intends to spend. */
  suiIn: number;
  /** DEEP produced by hop 1 (intermediate). */
  deepOut: number;
  /** DBUSDC the user receives after hop 2 — the headline number. */
  usdcOut: number;
  /** Effective DBUSDC per SUI for this size, incl. order-book impact. */
  rateUsdcPerSui: number;
  /** DEEP needed for fees across both hops. Expected 0 (whitelisted pools). */
  deepRequired: number;
}

/**
 * Live executable quote for SUI -> DEEP -> DBUSDC, read straight from the two
 * DeepBook pools' order books (not a price feed, not a guess).
 */
export async function quoteSuiToUsdc(suiIn: number): Promise<SwapQuote> {
  const db = readClient();
  // hop 1: spend SUI (quote of DEEP_SUI) to receive DEEP (base).
  const hop1 = await db.getBaseQuantityOut(POOL_DEEP_SUI, suiIn);
  const deepOut = hop1.baseOut;
  // hop 2: spend that DEEP (base of DEEP_DBUSDC) to receive DBUSDC (quote).
  const hop2 = await db.getQuoteQuantityOut(POOL_DEEP_DBUSDC, deepOut);
  const usdcOut = hop2.quoteOut;
  return {
    suiIn,
    deepOut,
    usdcOut,
    rateUsdcPerSui: suiIn > 0 ? usdcOut / suiIn : 0,
    deepRequired: (hop1.deepRequired ?? 0) + (hop2.deepRequired ?? 0),
  };
}

/** Live DEEP/SUI mid price from the order book — used for the UI ticker. */
export async function deepSuiMidPrice(): Promise<number> {
  return readClient().midPrice(POOL_DEEP_SUI);
}

export interface DeepQuote {
  suiIn: number;
  deepOut: number;
  rateDeepPerSui: number;
  deepRequired: number;
}

/**
 * Single-hop quote SUI -> DEEP on the whitelisted DEEP_SUI pool. This is the
 * robust fallback route: one pool, works at any size, zero DEEP fee.
 */
export async function quoteSuiToDeep(suiIn: number): Promise<DeepQuote> {
  const db = readClient();
  const hop = await db.getBaseQuantityOut(POOL_DEEP_SUI, suiIn);
  return {
    suiIn,
    deepOut: hop.baseOut,
    rateDeepPerSui: suiIn > 0 ? hop.baseOut / suiIn : 0,
    deepRequired: hop.deepRequired ?? 0,
  };
}

/** Build the single-hop SUI -> DEEP swap PTB (whitelisted pool, no DEEP fee). */
export function buildSuiToDeepSwapTx(opts: {
  suiIn: number;
  minDeepOut: number;
  sender: string;
}): Transaction {
  const db = readClient();
  const tx = new Transaction();
  tx.setSender(opts.sender);
  const [deepCoin, suiLeftover, deepFee] = tx.add(
    db.deepBook.swapExactQuoteForBase({
      poolKey: POOL_DEEP_SUI,
      amount: opts.suiIn,
      deepAmount: 0,
      minOut: opts.minDeepOut,
    }),
  );
  tx.transferObjects([deepCoin, suiLeftover, deepFee], opts.sender);
  return tx;
}

export interface BuildSwapOpts {
  suiIn: number;
  /** Minimum DBUSDC to accept, or the whole tx reverts (slippage guard). */
  minUsdcOut: number;
  sender: string;
}

/**
 * Build the real two-hop swap PTB. Every output coin (the DBUSDC plus any
 * partial-fill leftovers and zero fee coins) is returned to the sender so the
 * transaction never drops value. Hand the result to dapp-kit's
 * useSignAndExecuteTransaction — the connected wallet signs and submits it.
 */
export function buildSuiToUsdcSwapTx(opts: BuildSwapOpts): Transaction {
  const db = readClient();
  const tx = new Transaction();
  tx.setSender(opts.sender);

  // hop 1: SUI -> DEEP on whitelisted DEEP_SUI (0 DEEP fee). minOut 0 here;
  // the real slippage guard is enforced on the final DBUSDC in hop 2.
  const [deepCoin, suiLeftover, deepFee1] = tx.add(
    db.deepBook.swapExactQuoteForBase({
      poolKey: POOL_DEEP_SUI,
      amount: opts.suiIn,
      deepAmount: 0,
      minOut: 0,
    }),
  );

  // hop 2: that DEEP -> DBUSDC on whitelisted DEEP_DBUSDC (0 DEEP fee).
  const [deepLeftover, usdcCoin, deepFee2] = tx.add(
    db.deepBook.swapExactBaseForQuote({
      poolKey: POOL_DEEP_DBUSDC,
      amount: 0, // ignored when baseCoin is supplied
      baseCoin: deepCoin,
      deepAmount: 0,
      minOut: opts.minUsdcOut,
    }),
  );

  tx.transferObjects(
    [suiLeftover, deepFee1, deepLeftover, usdcCoin, deepFee2],
    opts.sender,
  );
  return tx;
}
