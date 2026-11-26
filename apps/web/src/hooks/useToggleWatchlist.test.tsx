import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "../helpers/constants";
import { useToggleWatchlist } from "./useToggleWatchlist";
import { useWatchlist } from "./useWatchlist";

/** A fake server: an in-memory watchlist behind PUT / DELETE /api/watchlist/:symbol and GET /api/watchlist. */
function fakeServer(initial: string[]) {
  let symbols = [...initial];
  const calls: string[] = [];
  const fetch = vi.fn(async (path: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push(`${method} ${path}`);
    const symbol = path.split("/").at(-1) ?? "";
    if (method === "PUT") symbols = [symbol, ...symbols.filter((s) => s !== symbol)];
    if (method === "DELETE") symbols = symbols.filter((s) => s !== symbol);
    return new Response(JSON.stringify({ symbols }), { status: 200 });
  });
  return { fetch, calls };
}

function setup(initial: string[]) {
  const server = fakeServer(initial);
  vi.stubGlobal("fetch", server.fetch);
  // Fresh forever, so only the code under test makes requests.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(queryKeys.watchlist(), { symbols: initial });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  // The app always has a star on screen watching the list, like this.
  const { result } = renderHook(
    () => {
      useWatchlist();
      return useToggleWatchlist();
    },
    { wrapper },
  );
  const watchlist = () => client.getQueryData<{ symbols: string[] }>(queryKeys.watchlist())?.symbols;
  return { result, client, server, watchlist };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe("useToggleWatchlist", () => {
  it("stores the server's response instead of refetching the watchlist", async () => {
    const { result, client, server, watchlist } = setup(["MSFT"]);
    act(() => result.current.mutate({ symbol: "AAPL", starred: true }));
    await waitFor(() => expect(watchlist()).toEqual(["AAPL", "MSFT"])); // optimistic

    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(server.calls).toEqual(["PUT /api/watchlist/AAPL"]);
    expect(watchlist()).toEqual(["AAPL", "MSFT"]);
  });

  it("sends quick toggles one at a time, in order, and ends on the last state", async () => {
    const { result, client, server, watchlist } = setup(["MSFT"]);
    act(() => {
      result.current.mutate({ symbol: "AAPL", starred: true });
      result.current.mutate({ symbol: "AAPL", starred: false });
    });
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(server.calls).toEqual(["PUT /api/watchlist/AAPL", "DELETE /api/watchlist/AAPL"]);
    expect(watchlist()).toEqual(["MSFT"]);
  });

  it("rolls back and refetches when the server says no", async () => {
    const { result, client, server, watchlist } = setup(["MSFT"]);
    server.fetch.mockImplementationOnce(async (path: string, init?: RequestInit) => {
      server.calls.push(`${init?.method ?? "GET"} ${path}`);
      return new Response(JSON.stringify({ error: { code: "UNAVAILABLE", message: "try later" } }), { status: 503 });
    });
    act(() => result.current.mutate({ symbol: "AAPL", starred: true }));

    await waitFor(() => expect(server.calls).toContain("GET /api/watchlist"));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(watchlist()).toEqual(["MSFT"]);
  });
});
