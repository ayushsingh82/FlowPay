import { test, expect, describe } from "bun:test";
import { createHandler } from "../src/server.ts";
import { FixtureAdapter } from "../src/adapters.ts";

const handler = createHandler(new FixtureAdapter());

function post(path: string, body: unknown): Promise<Response> {
  return handler(
    new Request(`http://test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

// Test helper: parse a JSON response body as an untyped record.
async function jsonBody(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe("HTTP handler", () => {
  test("GET /health", async () => {
    const res = await handler(new Request("http://test/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  test("POST /route with userId resolves fixture basket", async () => {
    const res = await post("/route", {
      userId: "demo-user",
      merchantToken: "USDC",
      amountUsd: 20,
    });
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.best).not.toBeNull();
    expect((body.candidates as unknown[]).length).toBeGreaterThan(0);
  });

  test("POST /route validates amount", async () => {
    const res = await post("/route", { userId: "demo-user", merchantToken: "USDC", amountUsd: -1 });
    expect(res.status).toBe(400);
  });

  test("POST /route unknown user => 400", async () => {
    const res = await post("/route", { userId: "nobody", merchantToken: "USDC", amountUsd: 20 });
    expect(res.status).toBe(400);
  });

  test("POST /risk with userId returns report", async () => {
    const res = await post("/risk", { userId: "demo-user" });
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body).toHaveProperty("shouldPause");
    expect(body).toHaveProperty("alerts");
    expect((body.health as unknown[]).length).toBeGreaterThan(0);
  });

  test("POST /risk flags bad LTV via inline obligations", async () => {
    const res = await post("/risk", {
      obligations: [{ obligationId: "ob", collateralUsd: 1000, debtUsd: 950, liquidationThreshold: 0.8 }],
      feeds: [{ symbol: "USDC", priceUsd: 1, publishedAtMs: Date.now() }],
    });
    const body = await jsonBody(res);
    expect(body.shouldPause).toBe(true);
  });

  test("POST /hedge returns recommendation", async () => {
    const res = await post("/hedge", {
      bill: { billId: "rent", amount: 40000, currency: "USDC", dueDate: "2026-07-10" },
      asOf: "2026-06-18",
      impliedVol: 0.5,
    });
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(["LOCK_RATE", "MONITOR", "NO_HEDGE"]).toContain(body.action as string);
  });

  test("unknown route => 404", async () => {
    const res = await handler(new Request("http://test/nope"));
    expect(res.status).toBe(404);
  });

  test("invalid JSON => 400", async () => {
    const res = await handler(
      new Request("http://test/route", { method: "POST", body: "{not json" }),
    );
    expect(res.status).toBe(400);
  });
});
