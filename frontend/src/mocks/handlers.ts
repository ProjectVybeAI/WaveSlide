// MSW mocks for designing and testing screens without the engine.
// Open any route with ?state=<name> (e.g. /overlay?state=paused, /?state=error) to switch states.
// Fixtures come from backend/app/contract/examples.py via `npm run contract`.
import { delay, http, HttpResponse, ws } from "msw";
import { datasetHandlers } from "@/features/dataset/mocks";
import { evaluationHandlers } from "@/features/evaluation/mocks";
import examples from "./fixtures/examples.json";

export type MockState = string;

export function currentMockState(): MockState {
  if (typeof window === "undefined") return "default";
  return new URLSearchParams(window.location.search).get("state") ?? "default";
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

const COMMAND = examples.command;
let connectedAt = 0;
const noHold = { hold: null, cooldown_ms_left: 0 };

function frame() {
  const state = currentMockState();
  const base = { ...examples.engineFrame };
  switch (state) {
    case "paused":
      return { ...base, active: false, state: "PAUSED", ...noHold };
    case "going-live":
      return {
        ...base,
        active: false,
        state: "PAUSED",
        pose: "THUMBS_UP",
        hold: { action: "toggle_active", label: "Live", caption: "Go", progress: 0.5, hold_ms: 1000 },
      };
    case "active":
      return { ...base, state: "ACTIVE", ...noHold };
    case "cooldown":
      return { ...base, state: "COOLDOWN", hold: null, cooldown_ms_left: 480 };
    case "nohand":
      return { ...base, state: "ACTIVE", hands: [], pose: "NONE", extended: null, ...noHold };
    case "replay":
      return { ...base, source: "replay" };
    case "go":
    case "blocked":
      return { ...base, state: "ACTIVE", ...noHold };
    case "cancelled":
      // The hold fills until the engine reports it cancelled, then the frames carry none.
      return Date.now() - connectedAt < 1000 ? base : { ...base, state: "ACTIVE", ...noHold };
    default:
      return base;
  }
}

/** A morning's worth of commands for the default state: 14 in all, one held back because WaveSlide had focus. */
function sessionHistory(): Array<{ after: number; event: object }> {
  const row = (id: number, action: string, gesture: string, keys: string[], extra: object = {}) => ({
    ...COMMAND,
    id,
    t: COMMAND.t - (14 - id) * 11,
    action,
    gesture,
    keys,
    slide: null,
    pipeline_ms: 21 + ((id * 7) % 13) + 0.4,
    ...extra,
  });
  const commands = [
    row(1, "toggle_active", "THUMBS_UP", []),
    row(2, "next", "SWIPE_RIGHT", ["right"]),
    row(3, "next", "SWIPE_RIGHT", ["right"]),
    row(4, "next", "SWIPE_RIGHT", ["right"]),
    row(5, "previous", "SWIPE_LEFT", ["left"]),
    row(6, "jump", "COUNT_5", ["5", "enter"], { slide: 5 }),
    row(7, "next", "SWIPE_RIGHT", ["right"]),
    row(8, "blank_toggle", "OPEN_PALM", ["b"]),
    row(9, "blank_toggle", "OPEN_PALM", ["b"]),
    row(10, "next", "SWIPE_RIGHT", ["right"], { blocked_reason: "focus: WaveSlide had focus" }),
    row(11, "next", "SWIPE_RIGHT", ["right"]),
    row(12, "previous", "SWIPE_LEFT", ["left"]),
    row(13, "jump", "COUNT_2", ["2", "enter"], { slide: 2 }),
    COMMAND,
  ];
  return commands.map((command) => ({ after: 200, event: { kind: "command", command } }));
}

/** Events a state plays shortly after the socket opens (the deck and the overlay follow them). */
function events(): Array<{ after: number; event: object }> {
  const state = currentMockState();
  const practice = { ...COMMAND, dry_run: true, pipeline_ms: 27.4 };
  const send = (command: object) => ({ kind: "command", command });
  switch (state) {
    case "jumped":
      return [
        { after: 700, event: send({ ...practice, id: 15, action: "jump", slide: 3, gesture: "COUNT_3" }) },
      ];
    case "blanked":
      return [
        {
          after: 700,
          event: send({
            ...practice,
            id: 16,
            action: "blank_toggle",
            slide: null,
            gesture: "OPEN_PALM",
            keys: ["b"],
          }),
        },
      ];
    case "go":
      return [{ after: 900, event: send({ ...COMMAND, id: 15 }) }];
    case "cancelled":
      return [{ after: 900, event: { kind: "hold_cancelled", action: "jump", reason: "pose_changed" } }];
    case "blocked":
      return [
        {
          after: 900,
          event: send({
            ...COMMAND,
            id: 15,
            action: "next",
            slide: null,
            gesture: "SWIPE_RIGHT",
            keys: ["right"],
            blocked_reason: "focus: WaveSlide had focus",
          }),
        },
      ];
    case "default":
      // Only the Live screen shows a log; the overlay and deck do not need the history.
      return window.location.pathname === "/" ? sessionHistory() : [];
    default:
      return [];
  }
}

const KEYS = {
  next: ["right"],
  previous: ["left"],
  blank_toggle: ["b"],
  start_show: ["shift+command+enter"],
  exit_show: ["esc"],
  jump: ["{n}", "enter"],
};
const profiles = [
  {
    id: "powerpoint",
    name: "PowerPoint",
    description: "Microsoft PowerPoint in slideshow mode.",
    jump_strategy: "type_number",
    unsupported: [],
    notes: "Jump types the slide number then Enter. Start slideshow starts from the current slide.",
    keys: KEYS,
  },
  {
    id: "google_slides",
    name: "Google Slides",
    description: "Google Slides presenting in a browser.",
    jump_strategy: "type_number",
    unsupported: [],
    notes: "Check jump and blank by hand; Google documents them inconsistently.",
    keys: { ...KEYS, start_show: ["command+enter"] },
  },
  {
    id: "pdf_viewer",
    name: "PDF viewer",
    description: "Adobe Acrobat Reader in full screen mode.",
    jump_strategy: "step_from_home",
    unsupported: ["blank_toggle"],
    notes: "Jump goes to the first page, then steps right. Blank screen is not available in PDF viewers.",
    keys: {
      next: ["right"],
      previous: ["left"],
      start_show: ["command+l"],
      exit_show: ["esc"],
      jump: ["home"],
    },
  },
  {
    id: "practice",
    name: "Practice deck",
    description: "WaveSlide's own ten-slide deck. Keys are never sent to another app.",
    jump_strategy: "type_number",
    unsupported: [],
    notes: "Commands go to the practice deck over the WebSocket instead of the keyboard.",
    keys: { ...KEYS, start_show: ["f"] },
  },
];

function snapshot() {
  const state = currentMockState();
  const base = { ...examples.engineSnapshot };
  if (state === "camera-error" || state === "camera-unavailable") return { ...base, camera_ok: false };
  if (state === "replay") return { ...base, source: "replay", session_id: "synthetic-demo" };
  if (state === "paused" || state === "going-live") return { ...base, active: false, state: "PAUSED" };
  return base;
}

function health() {
  const state = currentMockState();
  const base = examples.health;
  if (state === "permissions-missing")
    return { ...base, permissions: { camera: "granted", keyboard: "denied" } };
  if (state === "camera-unavailable")
    return { ...base, permissions: { camera: "denied", keyboard: "granted" } };
  if (state === "replay")
    return {
      ...base,
      source: "replay",
      keys_mode: "record",
      permissions: { camera: "not_required", keyboard: "not_required" },
    };
  return base;
}

function settings() {
  const state = currentMockState();
  const base = examples.settings;
  if (state === "compact") return { ...base, overlay: { ...base.overlay, compact: true } };
  if (state === "practice-profile" || state === "jumped" || state === "blanked")
    return { ...base, profile_id: "practice" };
  return base;
}

/** A still stand-in for the MJPEG preview: a blurred presenter in a dim room. */
const PREVIEW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><filter id="b"><feGaussianBlur stdDeviation="14"/></filter></defs><rect width="640" height="480" fill="#12161a"/><rect x="420" y="0" width="220" height="230" fill="#1b2026"/><g filter="url(#b)"><ellipse cx="400" cy="210" rx="70" ry="86" fill="#4a3b33"/><path d="M230 480 C240 330 330 300 400 300 C480 300 560 330 580 480Z" fill="#232a33"/></g></svg>`;

const engineSocket = ws.link("ws://*/ws/engine");

export const handlers = [
  ...datasetHandlers,
  ...evaluationHandlers,
  http.get("/api/health", () => respond(health())),
  http.get("/api/engine", () => respond(snapshot())),
  http.post("/api/engine/active", async ({ request }) => {
    const { active } = (await request.json()) as { active: boolean };
    return HttpResponse.json({ ...examples.engineSnapshot, active, state: active ? "ACTIVE" : "PAUSED" });
  }),
  http.post("/api/engine/source", async ({ request }) => {
    const body = (await request.json()) as { kind: string; session_id?: string };
    return HttpResponse.json({
      ...examples.engineSnapshot,
      source: body.kind,
      session_id: body.session_id ?? null,
    });
  }),
  http.post("/api/overlay", async ({ request }) => HttpResponse.json(await request.json())),
  http.get(
    "/api/preview.mjpg",
    () => new HttpResponse(PREVIEW, { headers: { "Content-Type": "image/svg+xml" } }),
  ),
  http.get("/api/profiles", () => respond(profiles)),
  http.get("/api/settings", () => respond(settings())),
  http.put("/api/settings", async ({ request }) => HttpResponse.json(await request.json())),
  http.post("/api/settings/reset", () => HttpResponse.json(examples.settings)),
  http.get("/api/settings/export", () => HttpResponse.json(examples.settings)),
  http.post("/api/settings/import", () => HttpResponse.json(examples.settings)),
  http.get("/api/cameras", () => respond(examples.cameras, [])),
  http.get("/api/sessions", () =>
    respond([examples.session, { ...examples.session, id: "synthetic-demo", kind: "talking" }], []),
  ),
  http.get("/api/model", () => {
    if (currentMockState() !== "ml-unavailable") return HttpResponse.json(examples.modelCard);
    return HttpResponse.json(
      { error: { code: "NO_MODEL", message: "No trained model yet.", details: {} } },
      { status: 404 },
    );
  }),
  http.get("/api/evaluations", () => respond([examples.evaluationSummary], [])),
  http.get("/api/evaluations/:id", () => respond(examples.evaluationReport)),
  engineSocket.addEventListener("connection", ({ client }) => {
    if (currentMockState() === "error") {
      client.close(1011, "engine unavailable");
      return;
    }
    connectedAt = Date.now();
    const send = () => client.send(JSON.stringify(frame()));
    send();
    const timer = setInterval(send, currentMockState() === "cancelled" ? 100 : 500);
    const planned = events();
    const timers = planned.map(({ after, event }) =>
      setTimeout(() => client.send(JSON.stringify({ type: "event", event })), after),
    );
    // Like the engine: once the deck acknowledges a command, publish it again with the measured time.
    client.addEventListener("message", ({ data }) => {
      if (typeof data !== "string") return;
      const message = JSON.parse(data) as { type: string; command_id?: number };
      if (message.type !== "deck_ack") return;
      for (const { event } of planned) {
        const command = (event as { command?: { id: number } }).command;
        if (command?.id !== message.command_id) continue;
        client.send(
          JSON.stringify({ type: "event", event: { kind: "command", command: { ...command, ack_ms: 31 } } }),
        );
      }
    });
    client.addEventListener("close", () => {
      clearInterval(timer);
      timers.forEach(clearTimeout);
    });
  }),
];
