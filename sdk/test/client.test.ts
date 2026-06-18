import { test, expect, describe } from 'bun:test';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { FlowPayClient, toUsdE6, PLACEHOLDER_DEPLOYMENT } from '../src/index.js';
import type { FlowPayDeployment } from '../src/index.js';

// Use fully-normalized 32-byte addresses so MoveCall targets/ids compare exactly
// (the SDK normalizes short ids like `0xcafe` to their padded 64-hex form).
const pad = (hex: string) => '0x' + hex.padStart(64, '0');
const PKG = pad('cafe');

const DEPLOYMENT: FlowPayDeployment = {
  network: 'test',
  packageId: PKG,
  pause: pad('a11'),
  riskParams: pad('a12'),
  oracleRegistry: pad('a13'),
  cashbackTreasury: pad('a14'),
  lendingMarket: pad('a15'),
  dexMarket: pad('a16'),
  isPlaceholder: false,
};

const SUI = '0x2::sui::SUI';
const VAULT = pad('cafe');
const MERCHANT = pad('beef');
const COIN = pad('c01');

const suiClient = new SuiJsonRpcClient({ network: 'testnet', url: getJsonRpcFullnodeUrl('testnet') });
const client = new FlowPayClient({ suiClient, deployment: DEPLOYMENT });

/** Extract MoveCall command bodies from a built transaction. */
function moveCalls(tx: ReturnType<FlowPayClient['createVault']>) {
  const data = tx.getData();
  return data.commands
    .map((c: any) => c.MoveCall)
    .filter((m: any): m is NonNullable<typeof m> => m != null);
}

describe('toUsdE6', () => {
  test('$20 → 20_000_000 micro-USD', () => {
    expect(toUsdE6(20)).toBe(20_000_000n);
  });
  test('rounds to nearest micro-USD', () => {
    expect(toUsdE6(4.9999996)).toBe(5_000_000n); // rounds up
    expect(toUsdE6(4.999999)).toBe(4_999_999n); // exact micro-USD
    expect(toUsdE6(0)).toBe(0n);
  });
  test('rejects negative / NaN', () => {
    expect(() => toUsdE6(-1)).toThrow();
    expect(() => toUsdE6(NaN)).toThrow();
  });
});

describe('createVault', () => {
  test('targets flow_vault::create with no type args', () => {
    const calls = moveCalls(client.createVault());
    expect(calls).toHaveLength(1);
    expect(calls[0].function).toBe('create');
    expect(calls[0].module).toBe('flow_vault');
    expect(calls[0].package).toBe(PKG);
    expect(calls[0].typeArguments ?? []).toHaveLength(0);
  });
});

describe('deposit', () => {
  test('targets flow_vault::deposit with coin type + 4 inputs', () => {
    const calls = moveCalls(client.deposit({ coinType: SUI, vault: VAULT, coin: COIN }));
    expect(calls).toHaveLength(1);
    expect(calls[0].module).toBe('flow_vault');
    expect(calls[0].function).toBe('deposit');
    expect(calls[0].typeArguments).toEqual([SUI]);
    expect(calls[0].arguments).toHaveLength(4); // vault, lendingMarket, pause, coin
  });
});

describe('pay', () => {
  test('targets smart_router::spend_entry', () => {
    const calls = moveCalls(
      client.pay({
        soldType: SUI,
        merchantType: SUI,
        merchant: MERCHANT,
        targetUsd: 20,
        soldDecimals: 9,
        vault: VAULT,
      }),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].package).toBe(PKG);
    expect(calls[0].module).toBe('smart_router');
    expect(calls[0].function).toBe('spend_entry');
    expect(calls[0].typeArguments).toEqual([SUI, SUI]); // Sold, Merchant
    // 6 shared objs + vault + clock + merchant + usd + decimals = 11
    expect(calls[0].arguments).toHaveLength(11);
  });
});

describe('read guards on placeholder', () => {
  const placeholderClient = new FlowPayClient({
    suiClient,
    deployment: { ...PLACEHOLDER_DEPLOYMENT },
  });
  test('watchVault throws a deploy-first error', async () => {
    await expect(placeholderClient.watchVault(VAULT, SUI)).rejects.toThrow(/deploy/i);
  });
  test('querySpends throws a deploy-first error', async () => {
    await expect(placeholderClient.querySpends()).rejects.toThrow(/deploy/i);
  });
  test('but pay() still BUILDS against placeholder (offline construction)', () => {
    const calls = moveCalls(
      placeholderClient.pay({
        soldType: SUI,
        merchantType: SUI,
        merchant: MERCHANT,
        targetUsd: 5,
        soldDecimals: 9,
        vault: VAULT,
      }),
    );
    expect(calls[0].function).toBe('spend_entry');
    expect(calls[0].package).toBe(pad('0')); // 0x0 normalized
  });
});

describe('spendEventType', () => {
  test('is package::smart_router::SpendEvent', () => {
    expect(client.spendEventType()).toBe(`${PKG}::smart_router::SpendEvent`);
  });
});
