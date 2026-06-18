/**
 * @flowpay/sdk — build real Sui transactions for FlowPay.
 *
 * ```ts
 * import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
 * import { FlowPayClient, TESTNET } from '@flowpay/sdk';
 *
 * const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
 * const flowpay = new FlowPayClient({ suiClient, deployment: TESTNET });
 *
 * const tx = flowpay.pay({
 *   soldType: '0x2::sui::SUI',
 *   merchantType: '0x...::usdc::USDC',
 *   merchant: '0xMERCHANT',
 *   targetUsd: 20,
 *   soldDecimals: 9,
 *   vault: '0xVAULT',
 * });
 * // sign + execute `tx` with any wallet / keypair
 * ```
 */

export {
  FlowPayClient,
  toUsdE6,
  USD_DECIMALS,
  type FlowPayClientOptions,
  type DepositParams,
  type PayParams,
  type CoinInput,
} from './client.js';

export {
  type FlowPayDeployment,
  PLACEHOLDER_DEPLOYMENT,
  TESTNET,
  TESTNET_DEPLOYMENT_PATH,
  SUI_CLOCK_OBJECT_ID,
  loadDeployment,
  loadDeploymentFromFile,
} from './deployments.js';
