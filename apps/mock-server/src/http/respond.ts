import type { ServerResponse } from "node:http";
import type { ApiError, ApiErrorCode } from "@mini-trade/contracts";

const STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** Thrown by handlers; turned into an `ApiError` body with the matching status. */
export class HttpError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    /** Overrides the default status for the code, e.g. 405 for a wrong method. */
    readonly status: number = STATUS[code],
  ) {
    super(message);
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(json),
    "cache-control": "no-store",
    ...headers,
  });
  res.end(json);
}

export function sendError(res: ServerResponse, error: HttpError, headers: Record<string, string> = {}) {
  const body: ApiError = { error: { code: error.code, message: error.message } };
  sendJson(res, error.status, body, headers);
}
