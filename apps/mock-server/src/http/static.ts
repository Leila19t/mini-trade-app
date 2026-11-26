import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { API_PREFIX } from "@mini-trade/contracts";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Vite puts hashed files in /assets: their names change with their content, so they can be cached forever. */
const IMMUTABLE = "public, max-age=31536000, immutable";
/** Everything else (index.html) is checked on every visit, so a deploy shows up straight away. */
const REVALIDATE = "no-cache";

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/**
 * Serves the built web app (`apps/web/dist`) in production, so the app, the
 * API and the WebSocket share one origin. Paths without a file extension fall
 * back to index.html, so client-side routes like /stocks/NVDA load the app.
 * Returns false for requests it doesn't handle (the API, other methods).
 */
export function createStaticHandler(root: string) {
  const base = resolve(root);
  const index = resolve(base, "index.html");

  return async function handleStatic(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (req.method !== "GET" && req.method !== "HEAD") return false;
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`)) return false;

    let file: string;
    try {
      file = resolve(base, `.${decodeURIComponent(pathname)}`);
    } catch {
      return false; // malformed escape sequence: let the caller answer 404
    }
    const inside = file === base || file.startsWith(base + sep);

    if (inside && (await isFile(file))) {
      send(req, res, file, pathname.startsWith("/assets/") ? IMMUTABLE : REVALIDATE);
      return true;
    }
    // A missing file (it has an extension) is a 404, not the app.
    if (!inside || extname(pathname) !== "") return false;
    send(req, res, index, REVALIDATE);
    return true;
  };
}

function send(req: IncomingMessage, res: ServerResponse, file: string, cacheControl: string) {
  res.writeHead(200, {
    "content-type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": cacheControl,
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file)
    .on("error", () => res.destroy())
    .pipe(res);
}
