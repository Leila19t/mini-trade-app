import { z } from "zod";

export const ApiErrorCode = z.enum([
  "BAD_REQUEST",
  "NOT_FOUND",
  "UNAVAILABLE",
  "INTERNAL",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

/** Body of every non-2xx HTTP response. */
export const ApiError = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
