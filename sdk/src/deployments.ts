/**
 * FlowPay deployment configuration.
 *
 * A `FlowPayDeployment` records the on-chain identities the SDK needs to build
 * transactions: the published Move package plus the shared objects every
 * mutating entry function references (created by each module's `init` on
 * publish).
 *
 * The loader reads `contracts/deployments/<network>.json` if present, and
 * otherwise falls back to a clearly-marked PLACEHOLDER so the SDK is usable
 * (transactions can be *built* and inspected) before the package is deployed.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Address of the system `Clock` shared object on every Sui network. */
export const SUI_CLOCK_OBJECT_ID = '0x6';

/**
 * The set of identities needed to build FlowPay transactions.
 *
 * `packageId` is the published `flowpay` package. The remaining fields are the
 * shared objects produced by the package's module `init` functions on publish:
 *   - `pause`            — `access_control::Pause`
 *   - `riskParams`       — `borrow_guard::RiskParams`
 *   - `oracleRegistry`   — `oracle::OracleRegistry`
 *   - `cashbackTreasury` — `cashback_mint::CashbackTreasury`
 *   - `lendingMarket`    — `lending::LendingMarket`
 *   - `dexMarket`        — `dex::DexMarket`
 */
export interface FlowPayDeployment {
  /** Network label this deployment targets (informational). */
  network: string;
  /** Published `flowpay` Move package id. */
  packageId: string;
  /** `access_control::Pause` shared object. */
  pause: string;
  /** `borrow_guard::RiskParams` shared object. */
  riskParams: string;
  /** `oracle::OracleRegistry` shared object. */
  oracleRegistry: string;
  /** `cashback_mint::CashbackTreasury` shared object. */
  cashbackTreasury: string;
  /** `lending::LendingMarket` shared object. */
  lendingMarket: string;
  /** `dex::DexMarket` shared object. */
  dexMarket: string;
  /**
   * True when this is the built-in placeholder (not a real on-chain
   * deployment). Read paths use this to fail loudly with a "deploy first"
   * error; build paths still work for offline PTB construction.
   */
  isPlaceholder?: boolean;
}

/**
 * Built-in placeholder deployment. Every id is `0x0` so it is obviously not a
 * real deployment. Transactions can still be *built* against it (useful for
 * tests, offline PTB inspection, and SDK demos), but any method that reads
 * chain state guards on `isPlaceholder` and throws.
 */
export const PLACEHOLDER_DEPLOYMENT: FlowPayDeployment = {
  network: 'placeholder',
  packageId: '0x0',
  pause: '0x0',
  riskParams: '0x0',
  oracleRegistry: '0x0',
  cashbackTreasury: '0x0',
  lendingMarket: '0x0',
  dexMarket: '0x0',
  isPlaceholder: true,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Default path to the testnet deployment JSON written by the publish script. */
export const TESTNET_DEPLOYMENT_PATH = resolve(
  __dirname,
  '../../contracts/deployments/testnet.json',
);

const REQUIRED_FIELDS: (keyof FlowPayDeployment)[] = [
  'packageId',
  'pause',
  'riskParams',
  'oracleRegistry',
  'cashbackTreasury',
  'lendingMarket',
  'dexMarket',
];

/** Validate that a parsed object has every required deployment field. */
function assertDeploymentShape(
  obj: unknown,
  source: string,
): asserts obj is FlowPayDeployment {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error(`FlowPay deployment at ${source} is not an object.`);
  }
  const record = obj as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (typeof record[field] !== 'string' || record[field] === '') {
      throw new Error(
        `FlowPay deployment at ${source} is missing required string field "${field}".`,
      );
    }
  }
}

/**
 * Load a deployment from a JSON file path. Throws if the file is missing or
 * malformed — use {@link loadDeployment} for the with-fallback behaviour.
 */
export function loadDeploymentFromFile(path: string): FlowPayDeployment {
  if (!existsSync(path)) {
    throw new Error(`FlowPay deployment file not found: ${path}`);
  }
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertDeploymentShape(parsed, path);
  return { ...parsed, network: parsed.network ?? 'testnet', isPlaceholder: false };
}

/**
 * Load the deployment for a network, falling back to the placeholder when no
 * deployment file exists. Pass an explicit `path` to override the default.
 */
export function loadDeployment(options?: {
  path?: string;
  network?: string;
}): FlowPayDeployment {
  const path = options?.path ?? TESTNET_DEPLOYMENT_PATH;
  if (existsSync(path)) {
    const loaded = loadDeploymentFromFile(path);
    return { ...loaded, network: options?.network ?? loaded.network };
  }
  return { ...PLACEHOLDER_DEPLOYMENT, network: options?.network ?? 'testnet' };
}

/**
 * The testnet deployment. Resolved at module load from
 * `contracts/deployments/testnet.json` if it exists, otherwise the placeholder
 * (so importing the SDK never throws pre-deploy).
 */
export const TESTNET: FlowPayDeployment = loadDeployment({ network: 'testnet' });
