import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WS_PATH } from "@mini-trade/contracts";
import { Chaos } from "./chaos";
import { DEFAULT_CONFIG, type ServerConfig } from "./config";
import { PriceEngine } from "./engine";
import { createApiHandler } from "./http/api";
import { HttpError, sendError } from "./http/respond";
import { createStaticHandler } from "./http/static";
import { DOCS_HTML, openApiJson } from "./openapi/document";
import { WatchlistStore } from "./watchlist-store";
import { PriceStream } from "./ws/price-stream";

export interface MockServer {
  /**
   * Starts listening. Pass port 0 for a random free port (tests). Resolves with the actual port.
   * `host` defaults to all interfaces; tests pass "127.0.0.1" (see testing.ts).
   */
  listen(port?: number, host?: string): Promise<number>;
  close(): Promise<void>;
  readonly http: Server;
  readonly engine: PriceEngine;
  readonly stream: PriceStream;
  readonly watchlists: WatchlistStore;
}

/** Wires the engine, REST API and WebSocket stream onto one HTTP server (same origin, like production). */
export function createMockServer(overrides: Partial<ServerConfig> = {}): MockServer {
  const config: ServerConfig = { ...DEFAULT_CONFIG, ...overrides };
  const chaos = new Chaos(config.chaos);
  const engine = new PriceEngine({ seed: config.seed });
  const watchlists = new WatchlistStore(config.initialWatchlist);
  const handleApi = createApiHandler({ engine, watchlists, chaos });
  const stream = new PriceStream({
    engine,
    chaos,
    flushIntervalMs: config.flushIntervalMs,
    heartbeatIntervalMs: config.heartbeatIntervalMs,
  });

  const handleStatic = config.webDir ? createStaticHandler(config.webDir) : undefined;

  // Docs and the health check are served before the API handler, so simulated latency and errors never hit them.
  const docs: Record<string, { type: string; body: string }> = {
    "/api/openapi.json": { type: "application/json; charset=utf-8", body: openApiJson() },
    "/docs": { type: "text/html; charset=utf-8", body: DOCS_HTML },
    "/health": { type: "application/json; charset=utf-8", body: '{"status":"ok"}' },
  };

  const http = createServer((req, res) => {
    const page = req.method === "GET" ? docs[new URL(req.url ?? "/", "http://localhost").pathname] : undefined;
    if (page) {
      res.writeHead(200, { "content-type": page.type });
      res.end(page.body);
      return;
    }

    handleApi(req, res)
      .then(async (handled) => handled || (await handleStatic?.(req, res)))
      .then((handled) => {
        if (!handled) sendError(res, new HttpError("NOT_FOUND", "Not found"));
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!res.headersSent) sendError(res, new HttpError("INTERNAL", "Something went wrong"));
      });
  });

  http.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname === WS_PATH) stream.handleUpgrade(req, socket, head);
    else socket.destroy();
  });

  return {
    http,
    engine,
    stream,
    watchlists,
    listen: (port = config.port, host?: string) =>
      new Promise((resolve, reject) => {
        http.once("error", reject);
        http.listen(port, host, () => resolve((http.address() as AddressInfo).port));
      }),
    close: () =>
      new Promise((resolve, reject) => {
        stream.close();
        http.closeAllConnections();
        http.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
