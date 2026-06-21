import { NextResponse } from "next/server";
import { Scallop } from "@scallop-io/sui-scallop-sdk";

// Builds a REAL Scallop mainnet supply (deposit) transaction.
//
// Scallop's SDK is locked to @mysten/sui 1.x, which conflicts with the app's 2.x
// stack (DeepBook + dapp-kit). So we keep Scallop entirely server-side: this
// route constructs the deposit PTB and returns it as a serialized JSON string.
// The browser reconstructs it with @mysten/sui 2.x (Transaction.from) and the
// user's wallet signs + executes it on mainnet. The 1.x -> 2.x JSON bridge is
// verified to round-trip.
//
// This moves REAL funds on mainnet. The client guards amounts and warns clearly.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADDRESS_ID = "695fcdc084f790c04eb068dc"; // Scallop mainnet address set

// poolCoinName -> on-chain decimals (for human -> base-unit conversion)
const DECIMALS: Record<string, number> = { sui: 9, usdc: 6, wusdc: 6 };

// Lazy singleton — init() fetches on-chain addresses and is slow; do it once.
let scallopPromise: Promise<InstanceType<typeof Scallop>> | null = null;
async function getScallop() {
  if (!scallopPromise) {
    scallopPromise = (async () => {
      const s = new Scallop({ networkType: "mainnet", addressId: ADDRESS_ID });
      await s.init();
      return s;
    })();
  }
  return scallopPromise;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { sender?: string; coin?: string; amount?: number };
    const sender = body.sender;
    const coin = (body.coin ?? "sui").toLowerCase();
    const amount = Number(body.amount);

    if (!sender || !/^0x[0-9a-fA-F]{64}$/.test(sender)) {
      return NextResponse.json({ error: "invalid sender address" }, { status: 400 });
    }
    if (!(coin in DECIMALS)) {
      return NextResponse.json({ error: `unsupported coin '${coin}'` }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "invalid amount" }, { status: 400 });
    }

    const baseUnits = Math.round(amount * 10 ** DECIMALS[coin]);

    const scallop = await getScallop();
    const builder = await scallop.createScallopBuilder();
    const tx = builder.createTxBlock();
    tx.setSender(sender);

    // depositQuick selects the sender's coins on mainnet and returns the sCoin
    // (interest-bearing receipt). returnSCoin=true => modern sCoin, not MarketCoin.
    const sCoin = await tx.depositQuick(baseUnits, coin, true);
    tx.transferObjects([sCoin], sender);

    // Serialize the 1.x transaction; the browser reconstructs it with 2.x.
    const raw = (tx as unknown as { txBlock: { toJSON: () => Promise<string> } }).txBlock;
    const txJson = await raw.toJSON();

    return NextResponse.json({
      txJson,
      coin,
      amount,
      baseUnits,
      sCoin: coin === "sui" ? "sSUI" : `s${coin.toUpperCase()}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed to build deposit tx";
    // Most common cause: the sender holds no coins of that type on mainnet.
    return NextResponse.json({ error: msg }, { status: 200 });
  }
}
