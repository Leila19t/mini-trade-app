import { readFileSync } from "node:fs";
import { endpoints, type EndpointName } from "@mini-trade/contracts";
import { buildOpenApiDocument } from "@mini-trade/contracts/openapi";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestServer, type TestServer } from "../testing";
import { OPENAPI_FILE, openApiJson } from "./document";

const doc = buildOpenApiDocument();

describe("OpenAPI document", () => {
  it("documents every endpoint with its method and path", () => {
    for (const name of Object.keys(endpoints) as EndpointName[]) {
      const { method, route } = endpoints[name];
      const operation = doc.paths[route.replace(/:(\w+)/g, "{$1}")]?.[method.toLowerCase()];
      expect(operation, name).toMatchObject({ operationId: name });
    }
  });

  it("only references schemas that exist", () => {
    const refs = [...JSON.stringify(doc).matchAll(/"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(10);
    for (const id of refs) expect(doc.components.schemas, id).toHaveProperty(id as string);
  });

  it("docs/openapi.json is up to date (run `pnpm --filter @mini-trade/server openapi`)", () => {
    expect(readFileSync(OPENAPI_FILE, "utf8")).toBe(openApiJson());
  });
});

describe("served docs", () => {
  let t: TestServer;
  // Chaos on with every request failing: the docs must still load.
  beforeEach(async () => {
    t = await startTestServer({
      chaos: { latencyMs: { min: 0, max: 0 }, errorRate: 1, socketDropAfterMs: { min: 1e9, max: 1e9 }, silentDropShare: 0 },
    });
  });
  afterEach(() => t.close());

  it("serves the document and the docs page, untouched by simulated failures", async () => {
    const json = await fetch(`${t.baseUrl}/api/openapi.json`);
    expect(json.status).toBe(200);
    expect(await json.json()).toEqual(doc);

    const page = await fetch(`${t.baseUrl}/docs`);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(await page.text()).toContain("/api/openapi.json");
  });
});
