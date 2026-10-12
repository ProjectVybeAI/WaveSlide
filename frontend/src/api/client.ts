// One typed REST client for the engine. Paths and bodies are checked against openapi.json.
import createClient, { type Middleware } from "openapi-fetch";
import { ApiError, toApiError } from "./errors";
import type { paths } from "./schema";

// Same origin in every mode: Vite proxies /api in dev, the engine serves the UI in `npm start`.
const baseUrl = import.meta.env.VITE_API_URL ?? "";

const throwOnError: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return undefined;
    const body: unknown = await response
      .clone()
      .json()
      .catch(() => undefined);
    throw toApiError(body, response.status);
  },
  onError() {
    return new ApiError("NETWORK_ERROR", "WaveSlide cannot reach its engine.", 0);
  },
};

export const api = createClient<paths>({ baseUrl });
api.use(throwOnError);

/** Unwraps openapi-fetch's { data } (errors already threw in the middleware). */
export async function unwrap<T>(request: Promise<{ data?: T }>): Promise<T> {
  const { data } = await request;
  return data as T;
}
