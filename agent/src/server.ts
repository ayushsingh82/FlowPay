/**
 * FlowPay agent HTTP service (Bun.serve).
 *
 * Thin layer over the pure cores. Endpoints accept typed JSON and return JSON.
 * The market-data adapter is injectable so tests / production can swap the
 * fixture source for a live Sui/DeepBook/Scallop/Pyth implementation.
 *
 * Endpoints:
 *   GET  /health                      -> liveness
 *   POST /route   { RouteApiRequest } -> RouteResult
 *   POST /risk    { RiskApiRequest }  -> RiskReport
 *   POST /hedge   { HedgeRequest }    -> HedgeRecommendation
 */

import { route } from "./router.ts";
import { evaluateRisk } from "./risk.ts";
import { advise } from "./hedge.ts";
import { FixtureAdapter, type MarketDataSource } from "./adapters.ts";
import type {
  AssetSymbol,
  HedgeRequest,
  RouteRequest,
  RiskRequest,
  UserBasket,
} from "./types.ts";

/** /route accepts either an inline basket or a userId resolved via adapter. */
export interface RouteApiRequest {
  userId?: string;
  basket?: UserBasket;
  merchantToken: AssetSymbol;
  amountUsd: number;
  gasUsd?: number;
  opportunityHorizonDays?: number;
}

/** /risk accepts a userId (adapter-resolved) plus optional thresholds. */
export interface RiskApiRequest {
  userId?: string;
  obligations?: RiskRequest["obligations"];
  feeds?: RiskRequest["feeds"];
  maxFeedAgeSec?: number;
  warnLtv?: number;
}

const ALL_ASSETS: AssetSymbol[] = ["SUI", "USDC", "BTC", "ETH", "DEEP"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function badRequest(message: string): Response {
  return json({ error: message }, 400);
}

async function handleRoute(
  body: RouteApiRequest,
  adapter: MarketDataSource,
): Promise<Response> {
  if (typeof body.amountUsd !== "number" || body.amountUsd <= 0) {
    return badRequest("amountUsd must be a positive number");
  }
  if (!body.merchantToken) return badRequest("merchantToken is required");

  let basket = body.basket;
  if (!basket && body.userId) {
    basket = (await adapter.getBasket(body.userId)) ?? undefined;
  }
  if (!basket) return badRequest("provide a basket or a known userId");

  const symbols = basket.holdings.map((h) => h.symbol);
  const markets = await adapter.getMarkets(symbols);

  const req: RouteRequest = {
    basket,
    merchantToken: body.merchantToken,
    amountUsd: body.amountUsd,
    ...(body.gasUsd !== undefined ? { gasUsd: body.gasUsd } : {}),
    ...(body.opportunityHorizonDays !== undefined
      ? { opportunityHorizonDays: body.opportunityHorizonDays }
      : {}),
  };
  return json(route(req, markets));
}

async function handleRisk(
  body: RiskApiRequest,
  adapter: MarketDataSource,
): Promise<Response> {
  const nowMs = Date.now();
  let obligations = body.obligations;
  let feeds = body.feeds;

  if ((!obligations || !feeds) && body.userId) {
    if (!obligations) obligations = await adapter.getObligations(body.userId);
    if (!feeds) feeds = await adapter.getFeeds(ALL_ASSETS);
  }
  if (!obligations || !feeds) {
    return badRequest("provide obligations+feeds or a known userId");
  }

  const req: RiskRequest = {
    obligations,
    feeds,
    nowMs,
    ...(body.maxFeedAgeSec !== undefined
      ? { maxFeedAgeSec: body.maxFeedAgeSec }
      : {}),
    ...(body.warnLtv !== undefined ? { warnLtv: body.warnLtv } : {}),
  };
  return json(evaluateRisk(req));
}

function handleHedge(body: HedgeRequest): Response {
  if (!body.bill || typeof body.bill.amount !== "number") {
    return badRequest("bill with a numeric amount is required");
  }
  const asOf = body.asOf ?? new Date().toISOString();
  return json(advise({ ...body, asOf }));
}

/** Build a fetch handler bound to a given data source (testable). */
export function createHandler(
  adapter: MarketDataSource,
): (req: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "GET" && pathname === "/health") {
      return json({ status: "ok", service: "flowpay-agent" });
    }

    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return badRequest("invalid JSON body");
      }
      switch (pathname) {
        case "/route":
          return handleRoute(body as RouteApiRequest, adapter);
        case "/risk":
          return handleRisk(body as RiskApiRequest, adapter);
        case "/hedge":
          return handleHedge(body as HedgeRequest);
      }
    }

    return json({ error: "not found" }, 404);
  };
}

const PORT = Number(Bun.env.PORT ?? 3001);

// Only start a listening server when run directly (not when imported by tests).
if (import.meta.main) {
  const handler = createHandler(new FixtureAdapter());
  const server = Bun.serve({ port: PORT, fetch: handler });
  console.log(`flowpay-agent listening on http://localhost:${server.port}`);
  console.log("  GET  /health");
  console.log("  POST /route   POST /risk   POST /hedge");
}
