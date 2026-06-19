/**
 * FlowPayClient — the three calls the pitch promises (`deposit`, `pay`,
 * `watchVault`), plus `createVault`, built on the official `@mysten/sui` SDK.
 *
 * Every "write" method returns a `Transaction` that is fully constructed
 * offline (no network needed to build it) so it can be inspected, signed by
 * any signer/wallet, or dry-run. "Read" methods (`watchVault`, `querySpends`)
 * talk to a `SuiClient` and guard against the placeholder deployment.
 */

import { SuiJsonRpcClient, type SuiEvent } from '@mysten/sui/jsonRpc';
import { Transaction, type TransactionObjectArgument } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import {
  type FlowPayDeployment,
  TESTNET,
  SUI_CLOCK_OBJECT_ID,
} from './deployments.js';

/** A coin to spend: either an on-chain object id, or a PTB result argument. */
export type CoinInput = string | TransactionObjectArgument;

export interface FlowPayClientOptions {
  /** Connected Sui JSON-RPC client (used by read methods). */
  suiClient: SuiJsonRpcClient;
  /** Deployment identities. Defaults to the resolved {@link TESTNET}. */
  deployment?: FlowPayDeployment;
}

export interface DepositParams {
  /** Fully-qualified coin type, e.g. `0x2::sui::SUI`. */
  coinType: string;
  /** The vault object id to deposit into. */
  vault: string;
  /** Coin to deposit — object id string or a PTB argument (e.g. a split result). */
  coin: CoinInput;
}

export interface PayParams {
  /** Asset the user sells (fully-qualified type). */
  soldType: string;
  /** Token the merchant receives (fully-qualified type). */
  merchantType: string;
  /** Recipient address. */
  merchant: string;
  /** Payment size in USD (e.g. 20 for $20). Converted to micro-USD on-chain. */
  targetUsd: number;
  /** Decimals of the sold asset (e.g. 9 for SUI, 6 for USDC). */
  soldDecimals: number;
  /** The user's vault object id. */
  vault: string;
}

/** Micro-USD (1e6) is the protocol's USD fixed-point unit (`usd_e6`). */
export const USD_DECIMALS = 6;

/** Convert a human USD amount to the on-chain `usd_e6` integer. */
export function toUsdE6(usd: number): bigint {
  if (!Number.isFinite(usd) || usd < 0) {
    throw new Error(`Invalid USD amount: ${usd}`);
  }
  return BigInt(Math.round(usd * 10 ** USD_DECIMALS));
}

export class FlowPayClient {
  readonly suiClient: SuiJsonRpcClient;
  readonly deployment: FlowPayDeployment;

  constructor(options: FlowPayClientOptions) {
    this.suiClient = options.suiClient;
    this.deployment = options.deployment ?? TESTNET;
  }

  /** The package's module-qualified target for `module::fn`. */
  private target(module: string, fn: string): `${string}::${string}::${string}` {
    return `${this.deployment.packageId}::${module}::${fn}`;
  }

  private assertDeployed(method: string): void {
    if (this.deployment.isPlaceholder || this.deployment.packageId === '0x0') {
      throw new Error(
        `FlowPayClient.${method}() needs a real deployment. Run ` +
          `\`cd contracts && ./deploy.sh\` then re-run, or pass a deployment ` +
          `loaded from contracts/deployments/testnet.json.`,
      );
    }
  }

  // ── Writes (build offline) ────────────────────────────────────────────────

  /** Create + transfer a fresh `FlowVault` to the signer. */
  createVault(tx: Transaction = new Transaction()): Transaction {
    tx.moveCall({ target: this.target('flow_vault', 'create') });
    return tx;
  }

  /** Deposit a coin of `coinType` into the vault (auto-earns on Scallop). */
  deposit(params: DepositParams, tx: Transaction = new Transaction()): Transaction {
    const coinArg = typeof params.coin === 'string' ? tx.object(params.coin) : params.coin;
    tx.moveCall({
      target: this.target('flow_vault', 'deposit'),
      typeArguments: [params.coinType],
      arguments: [
        tx.object(params.vault),
        tx.object(this.deployment.lendingMarket),
        tx.object(this.deployment.pause),
        coinArg,
      ],
    });
    return tx;
  }

  /**
   * The headline atomic spend: borrow/withdraw → DeepBook route → settle to
   * merchant → mint DEEP cashback → emit `SpendEvent`, all in one PTB.
   */
  pay(params: PayParams, tx: Transaction = new Transaction()): Transaction {
    tx.moveCall({
      target: this.target('smart_router', 'spend_entry'),
      typeArguments: [params.soldType, params.merchantType],
      arguments: [
        tx.object(params.vault),
        tx.object(this.deployment.lendingMarket),
        tx.object(this.deployment.dexMarket),
        tx.object(this.deployment.oracleRegistry),
        tx.object(this.deployment.riskParams),
        tx.object(this.deployment.cashbackTreasury),
        tx.object(this.deployment.pause),
        tx.object(SUI_CLOCK_OBJECT_ID),
        tx.pure.address(params.merchant),
        tx.pure.u64(toUsdE6(params.targetUsd)),
        tx.pure.u8(params.soldDecimals),
      ],
    });
    return tx;
  }

  // ── Reads (need network + a real deployment) ────────────────────────────────

  /**
   * Read the vault's sCoin balance for `coinType` via a dev-inspect call to the
   * `flow_vault::scoin_balance<T>` view. `sender` is any address (dev-inspect
   * does not execute), defaulting to the zero address.
   */
  async watchVault(
    vault: string,
    coinType: string,
    sender = '0x0000000000000000000000000000000000000000000000000000000000000000',
  ): Promise<{ vault: string; coinType: string; scoinBalance: bigint }> {
    this.assertDeployed('watchVault');
    const tx = new Transaction();
    tx.moveCall({
      target: this.target('flow_vault', 'scoin_balance'),
      typeArguments: [coinType],
      arguments: [tx.object(vault)],
    });
    const res = await this.suiClient.devInspectTransactionBlock({
      sender,
      transactionBlock: tx,
    });
    const returnValues = res.results?.[0]?.returnValues;
    if (!returnValues || returnValues.length === 0) {
      throw new Error(`watchVault: no return value (vault ${vault} / ${coinType})`);
    }
    const [bytes] = returnValues[0] as [number[], string];
    const scoinBalance = bcs.u64().parse(Uint8Array.from(bytes));
    return { vault, coinType, scoinBalance: BigInt(scoinBalance) };
  }

  /** Fully-qualified type of the on-chain `SpendEvent`. */
  spendEventType(): string {
    return this.target('smart_router', 'SpendEvent');
  }

  /** Query recent `SpendEvent`s emitted by the FlowPay package. */
  async querySpends(limit = 20): Promise<
    Array<{ txDigest: string; timestampMs: string | null; parsedJson: unknown }>
  > {
    this.assertDeployed('querySpends');
    const page = await this.suiClient.queryEvents({
      query: { MoveEventType: this.spendEventType() },
      limit,
      order: 'descending',
    });
    return page.data.map((e: SuiEvent) => ({
      txDigest: e.id.txDigest,
      timestampMs: e.timestampMs ?? null,
      parsedJson: e.parsedJson,
    }));
  }
}
