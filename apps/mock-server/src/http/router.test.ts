import { describe, expect, it } from "vitest";
import { compile, Router } from "./router";

describe("compile", () => {
  it("extracts parameter names in order", () => {
    expect(compile("/api/stocks/:symbol/history").keys).toEqual(["symbol"]);
  });

  it("escapes literal segments", () => {
    const { pattern } = compile("/api/v1.0/x");
    expect(pattern.test("/api/v1.0/x")).toBe(true);
    expect(pattern.test("/api/v1a0/x")).toBe(false);
  });
});

describe("Router", () => {
  const router = new Router<string>()
    .add("GET", "/api/stocks/:symbol", "detail")
    .add("GET", "/api/stocks/:symbol/history", "history")
    .add("PUT", "/api/watchlist/:symbol", "add")
    .add("DELETE", "/api/watchlist/:symbol", "remove");

  it("matches and decodes params", () => {
    expect(router.match("GET", "/api/stocks/BRK.B")).toEqual({ kind: "found", handler: "detail", params: { symbol: "BRK.B" } });
    expect(router.match("GET", "/api/stocks/A%20B/history")).toEqual({ kind: "found", handler: "history", params: { symbol: "A B" } });
  });

  it("allows a trailing slash", () => {
    expect(router.match("GET", "/api/stocks/AAPL/").kind).toBe("found");
  });

  it("does not let a param span segments", () => {
    expect(router.match("GET", "/api/stocks/A/B").kind).toBe("not-found");
  });

  it("reports the allowed methods when only the method is wrong", () => {
    expect(router.match("POST", "/api/watchlist/AAPL")).toEqual({ kind: "method-not-allowed", allowed: ["PUT", "DELETE"] });
  });

  it("turns malformed escapes into an empty param instead of throwing", () => {
    expect(router.match("GET", "/api/stocks/%E0")).toEqual({ kind: "found", handler: "detail", params: { symbol: "" } });
  });
});
