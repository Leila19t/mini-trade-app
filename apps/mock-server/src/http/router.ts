import type { HttpMethod } from "@mini-trade/contracts";

export type Params = Record<string, string>;

export type RouteMatch<H> =
  | { kind: "found"; handler: H; params: Params }
  | { kind: "method-not-allowed"; allowed: HttpMethod[] }
  | { kind: "not-found" };

interface Route<H> {
  method: HttpMethod;
  pattern: RegExp;
  keys: string[];
  handler: H;
}

/** Turns "/api/stocks/:symbol" into a regex plus the parameter names, in order. */
export function compile(route: string): { pattern: RegExp; keys: string[] } {
  const keys: string[] = [];
  const source = route
    .split("/")
    .map((part) => {
      if (!part.startsWith(":")) return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      keys.push(part.slice(1));
      return "([^/]+)";
    })
    .join("/");
  return { pattern: new RegExp(`^${source}/?$`), keys };
}

/**
 * A tiny router: enough for six endpoints, without pulling in a framework.
 * Routes come from `endpoints` in contracts, so the server can't drift from the client.
 */
export class Router<H> {
  private readonly routes: Route<H>[] = [];

  add(method: HttpMethod, route: string, handler: H): this {
    this.routes.push({ method, handler, ...compile(route) });
    return this;
  }

  match(method: string, pathname: string): RouteMatch<H> {
    const allowed: HttpMethod[] = [];
    for (const route of this.routes) {
      const found = route.pattern.exec(pathname);
      if (!found) continue;
      if (route.method !== method) {
        allowed.push(route.method);
        continue;
      }
      const params: Params = {};
      route.keys.forEach((key, i) => {
        params[key] = safeDecode(found[i + 1] ?? "");
      });
      return { kind: "found", handler: route.handler, params };
    }
    return allowed.length > 0 ? { kind: "method-not-allowed", allowed } : { kind: "not-found" };
  }
}

/** Malformed escapes like "%E0" become an empty string, which then fails validation as a bad request. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
