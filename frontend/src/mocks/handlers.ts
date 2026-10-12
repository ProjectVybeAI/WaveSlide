// MSW mocks for designing and testing screens without the engine.
// Open any route with ?state=<name> (e.g. /overlay?state=paused, /?state=error) to switch states.
// Fixtures come from backend/app/contract/examples.py via `npm run contract`.
import { delay, http, HttpResponse, ws } from "msw";
import examples from "./fixtures/examples.json";

export type MockState = "default" | "empty" | "error" | "loading" | "paused" | "holding" | "nohand";

export function currentMockState(): MockState {
  if (typeof window === "undefined") return "default";
  return (new URLSearchParams(window.location.search).get("state") as MockState | null) ?? "default";
}

const engineError = () =>
  HttpResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "The WaveSlide engine stopped responding.", details: {} } },
    { status: 500 },
  );

async function respond<T extends object>(body: T, emptyBody?: unknown) {
  const state = currentMockState();
  if (state === "loading") await delay("infinite");
  if (state === "error") return engineError();
  if (state === "empty" && emptyBody !== undefined) return HttpResponse.json(emptyBody);
  return HttpResponse.json(body);
}

function frame() {
  const state = currentMockState();
  const base = { ...examples.engineFrame };
  if (state === "paused") return { ...base, active: false, state: "PAUSED", hold: null };
  if (state === "nohand") return { ...base, hands: [], pose: "NONE", extended: null, hold: null };
  return base;
}

const engineSocket = ws.link("ws://*/ws/engine");

export const handlers = [
  http.get("/api/health", () => respond(examples.health)),
  http.get("/api/engine", () => respond(examples.engineSnapshot)),
  http.post("/api/engine/active", async ({ request }) => {
    const { active } = (await request.json()) as { active: boolean };
    return HttpResponse.json({ ...examples.engineSnapshot, active, state: active ? "ACTIVE" : "PAUSED" });
  }),
  http.get("/api/settings", () => respond(examples.settings)),
  http.put("/api/settings", async ({ request }) => HttpResponse.json(await request.json())),
  http.get("/api/cameras", () => respond(examples.cameras, [])),
  http.get("/api/sessions", () => respond([examples.session], [])),
  http.get("/api/model", () =>
    HttpResponse.json(
      { error: { code: "NO_MODEL", message: "No trained model yet.", details: {} } },
      { status: 404 },
    ),
  ),
  http.get("/api/evaluations", () => respond([examples.evaluationSummary], [])),
  http.get("/api/evaluations/:id", () => respond(examples.evaluationReport)),
  engineSocket.addEventListener("connection", ({ client }) => {
    if (currentMockState() === "error") {
      client.close(1011, "engine unavailable");
      return;
    }
    const send = () => client.send(JSON.stringify(frame()));
    send();
    const timer = setInterval(send, 500);
    client.addEventListener("close", () => clearInterval(timer));
  }),
];
