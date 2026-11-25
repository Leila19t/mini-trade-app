import { describe, expect, it } from "vitest";
import { WatchlistStore } from "./watchlist-store";

describe("WatchlistStore", () => {
  it("gives each user their own copy of the initial list", () => {
    const store = new WatchlistStore(["AAPL"]);
    store.add("a", "MSFT");
    expect(store.get("a")).toEqual(["MSFT", "AAPL"]);
    expect(store.get("b")).toEqual(["AAPL"]);
  });

  it("returns copies, so callers can't mutate the store", () => {
    const store = new WatchlistStore(["AAPL"]);
    store.get("a").push("MSFT");
    expect(store.get("a")).toEqual(["AAPL"]);
  });
});
