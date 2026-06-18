#!/usr/bin/env bash
#
# FlowPay — one-command Sui Testnet deploy.
#
# Publishes the `flowpay` Move package and captures the package ID plus every
# shared object created by the modules' init() functions into
# deployments/testnet.json (consumed by ../sdk and the frontend).
#
# Prereqs:
#   • sui CLI on PATH         (sui --version)
#   • active env = testnet    (sui client switch --env testnet)
#   • a funded address        (https://faucet.sui.io/?address=$(sui client active-address))
#
# Usage:
#   cd contracts && ./deploy.sh
#
set -euo pipefail

cd "$(dirname "$0")"
OUT_DIR="deployments"
OUT_FILE="$OUT_DIR/testnet.json"
GAS_BUDGET="${GAS_BUDGET:-500000000}"

command -v sui >/dev/null || { echo "❌ sui CLI not found on PATH"; exit 1; }
command -v python3 >/dev/null || { echo "❌ python3 required to parse output"; exit 1; }

ADDR="$(sui client active-address)"
echo "▸ Publisher : $ADDR"
echo "▸ Env       : $(sui client active-env)"

# Fail early (with a helpful link) if the address has no gas.
if ! sui client gas --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d else 1)" 2>/dev/null; then
  echo "❌ No gas coins. Fund the address then re-run:"
  echo "   https://faucet.sui.io/?address=$ADDR"
  exit 1
fi

echo "▸ Building + publishing (gas budget $GAS_BUDGET)…"
sui client publish --gas-budget "$GAS_BUDGET" --json > /tmp/flowpay-publish.json

mkdir -p "$OUT_DIR"

# Parse the publish effects: package ID + each shared object keyed by its type.
python3 - "$OUT_FILE" <<'PY'
import json, sys, re

out_file = sys.argv[1]
data = json.load(open("/tmp/flowpay-publish.json"))

changes = data.get("objectChanges", [])
pkg = next((c["packageId"] for c in changes if c.get("type") == "published"), None)
if not pkg:
    print("❌ No published package found in output"); sys.exit(1)

# Map the module-shared singletons we care about to friendly keys.
WANT = {
    "access_control::Pause":        "pause",
    "borrow_guard::RiskParams":     "riskParams",
    "oracle::OracleRegistry":       "oracleRegistry",
    "cashback_mint::CashbackTreasury": "cashbackTreasury",
    "lending::LendingMarket":        "lendingMarket",
    "dex::DexMarket":                "dexMarket",
}
result = {"network": "testnet", "packageId": pkg, "publisher": data.get("transaction", {}).get("data", {}).get("sender")}
admin_cap = None
for c in changes:
    if c.get("type") != "created":
        continue
    otype = c.get("objectType", "")
    oid = c.get("objectId")
    for suffix, key in WANT.items():
        if otype.endswith("::" + suffix):
            result[key] = oid
    if otype.endswith("::access_control::AdminCap"):
        admin_cap = oid
if admin_cap:
    result["adminCap"] = admin_cap

json.dump(result, open(out_file, "w"), indent=2)
open(out_file, "a").write("\n")
print("✅ Wrote", out_file)
for k, v in result.items():
    print(f"   {k:18} {v}")
print()
print(f"🔎 Explorer: https://suiscan.xyz/testnet/object/{pkg}")
PY

echo "▸ Done. ../sdk and the frontend can now read $OUT_FILE"
