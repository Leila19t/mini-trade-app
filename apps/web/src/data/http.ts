import {
  ApiError,
  endpoints,
  type ApiErrorCode,
  type EndpointName,
  type EndpointResponse,
} from "@mini-trade/contracts";

/**
 * A failed request. `code` is the server's error code, or one of ours:
 * NETWORK (no response at all) and INVALID_RESPONSE (body didn't match the contract).
 */
export class HttpError extends Error {
  readonly code: ApiErrorCode | "NETWORK" | "INVALID_RESPONSE";
  readonly status: number | undefined;

  constructor(code: HttpError["code"], message: string, status?: number) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
  }
}

type PathArgs<K extends EndpointName> = Parameters<(typeof endpoints)[K]["path"]>;

/**
 * Calls an endpoint from the contracts and returns its parsed response, e.g.
 * `request("getHistory", ["AAPL", "1M"], { signal })`.
 * Every response is validated; anything off-contract is logged and thrown as
 * an HttpError, never handed to the UI.
 */
export async function request<K extends EndpointName>(
  name: K,
  pathArgs: PathArgs<K>,
  options: { signal?: AbortSignal } = {},
): Promise<EndpointResponse<K>> {
  const endpoint = endpoints[name];
  // Each endpoint's `path` takes its own arguments; PathArgs<K> already matched them to `name`.
  const path = (endpoint.path as (...args: PathArgs<K>) => string)(...pathArgs);

  let response: Response;
  try {
    response = await fetch(path, { method: endpoint.method, signal: options.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new HttpError("NETWORK", `Could not reach the server (${endpoint.method} ${path})`);
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const parsed = ApiError.safeParse(body);
    if (parsed.success) {
      throw new HttpError(parsed.data.error.code, parsed.data.error.message, response.status);
    }
    throw new HttpError("INTERNAL", `${endpoint.method} ${path} failed with ${response.status}`, response.status);
  }

  const parsed = endpoint.response.safeParse(body);
  if (!parsed.success) {
    console.error(`Invalid response from ${endpoint.method} ${path}`, parsed.error);
    throw new HttpError("INVALID_RESPONSE", `Unexpected response from ${path}`, response.status);
  }
  return parsed.data as EndpointResponse<K>;
}
