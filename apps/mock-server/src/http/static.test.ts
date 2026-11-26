import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApiError, StockListResponse } from "@mini-trade/contracts";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestServer, type TestServer } from "../testing";

/** A fake web build: index.html, one hashed asset and a public file. */
let webDir: string;
beforeAll(() => {
  webDir = mkdtempSync(join(tmpdir(), "mini-trade-web-"));
  mkdirSync(join(webDir, "assets"));
  writeFileSync(join(webDir, "index.html"), "<!doctype html><title>Mini Trade</title>");
  writeFileSync(join(webDir, "assets", "index-abc123.js"), "console.log('app')");
  writeFileSync(join(webDir, "favicon.svg"), "<svg/>");
});
afterAll(() => rmSync(webDir, { recursive: true, force: true }));

let t: TestServer;
beforeEach(async () => {
  t = await startTestServer({ webDir });
});
afterEach(() => t.close());

const get = (path: string, init?: RequestInit) => fetch(`${t.baseUrl}${path}`, init);

describe("serving the web app", () => {
  it("serves index.html at the root, checked on every visit", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-cache");
    expect(await res.text()).toContain("<title>Mini Trade</title>");
  });

  it("serves index.html for client-side routes, so a refresh on /stocks/NVDA works", async () => {
    const res = await get("/stocks/NVDA?range=1M");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<title>Mini Trade</title>");
  });

  it("serves hashed assets with a long cache and the right type", async () => {
    const res = await get("/assets/index-abc123.js");
    expect(res.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(await res.text()).toBe("console.log('app')");
  });

  it("serves other public files", async () => {
    const res = await get("/favicon.svg");
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
  });

  it("404s for a missing file instead of sending the app", async () => {
    const res = await get("/assets/missing.js");
    expect(res.status).toBe(404);
  });

  it("never serves files outside the build", async () => {
    for (const path of ["/../package.json", "/%2e%2e/package.json", "/assets/%2e%2e/%2e%2e/package.json"]) {
      const res = await get(path);
      expect(await res.text(), path).not.toContain('"name"');
    }
  });

  it("leaves the API alone: API routes still answer JSON, unknown ones a JSON 404", async () => {
    StockListResponse.parse(await (await get("/api/stocks")).json());
    const missing = await get("/api/nope");
    expect(missing.status).toBe(404);
    ApiError.parse(await missing.json());
  });

  it("answers HEAD without a body", async () => {
    const res = await get("/", { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });
});

describe("health check", () => {
  it("answers ok", async () => {
    const res = await get("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
