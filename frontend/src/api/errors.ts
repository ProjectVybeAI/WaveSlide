// The engine's error shape: { error: { code, message, details } }. One type for every failure.
import type { ErrorCode } from "./types";

export class ApiError extends Error {
  readonly code: ErrorCode | "NETWORK_ERROR";
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(code: ApiError["code"], message: string, status: number, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ErrorBody = { error?: { code?: ErrorCode; message?: string; details?: Record<string, unknown> } };

export function toApiError(body: unknown, status: number): ApiError {
  const error = (body as ErrorBody | undefined)?.error;
  if (error?.code && error.message) return new ApiError(error.code, error.message, status, error.details);
  return new ApiError("INTERNAL_ERROR", "Something went wrong in the WaveSlide engine.", status);
}

/** A sentence for the screen. Network failures say what to do, not "Failed to fetch". */
export function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "WaveSlide cannot reach its engine. Check that `npm run dev` or `npm start` is still running.";
}
