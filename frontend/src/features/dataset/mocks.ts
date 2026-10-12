// MSW handlers for the Dataset screen and the background jobs it shares with the Evaluation lab:
// sessions, the guided recorder, the trained model and job progress. Open /dataset?state=<name>:
//   default    synthetic seed sessions plus two recorded ones, a trained model
//   empty      no sessions and no model
//   recording  the recorder view, stepping through prompts every 4 s
//   loading / error as everywhere. Register with `...datasetHandlers` first in src/mocks/handlers.ts.
import { delay, http, HttpResponse, ws } from "msw";
import type { Job, SessionSummary } from "@/api/types";
import examples from "@/mocks/fixtures/examples.json";
import { summaries } from "@/features/evaluation/fixtures";

const state = () => new URLSearchParams(window.location.search).get("state") ?? "default";
const onEvaluationPage = () => window.location.pathname.startsWith("/evaluation");

const engineError = () =>
  HttpResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "The WaveSlide engine stopped responding.", details: {} } },
    { status: 500 },
  );

const session = (
  over: Partial<SessionSummary> & Pick<SessionSummary, "id" | "kind" | "participant">,
): SessionSummary => ({
  source: "synthetic",
  distance_m: 1,
  lighting: "normal",
  luminance_mean: null,
  n_frames: 4512,
  duration_s: 150.4,
  created_at: "2026-10-01T09:00:00+00:00",
  ...over,
});

export const mockSessions: SessionSummary[] = [
  session({ id: "synthetic-gestures-p1", kind: "gestures", participant: "p1" }),
  session({
    id: "synthetic-gestures-p2",
    kind: "gestures",
    participant: "p2",
    n_frames: 4398,
    duration_s: 146.6,
  }),
  session({
    id: "synthetic-gestures-p3",
    kind: "gestures",
    participant: "p3",
    n_frames: 4630,
    duration_s: 154.3,
  }),
  session({
    id: "synthetic-talking-p1",
    kind: "talking",
    participant: "p1",
    n_frames: 5400,
    duration_s: 180,
  }),
  session({
    id: "synthetic-talking-p2",
    kind: "talking",
    participant: "p2",
    n_frames: 5400,
    duration_s: 180,
  }),
  session({
    id: "synthetic-two-hand",
    kind: "two_hand",
    participant: "p1",
    n_frames: 1840,
    duration_s: 61.3,
  }),
  session({
    id: "synthetic-demo",
    kind: "demo",
    participant: "demo",
    distance_m: null,
    lighting: null,
    n_frames: 900,
    duration_s: 30,
  }),
  session({
    id: "rec-2026-10-12-p4",
    kind: "gestures",
    participant: "p4",
    source: "recorded",
    distance_m: 0.5,
    lighting: "bright",
    luminance_mean: 168,
    n_frames: 4480,
    duration_s: 149.3,
    created_at: "2026-10-12T10:40:00+00:00",
  }),
  session({
    id: "rec-2026-10-12-pilot",
    kind: "gestures",
    participant: "pilot-participant-from-the-seminar-group-b",
    source: "recorded",
    distance_m: 2,
    lighting: "dim",
    luminance_mean: 54,
    n_frames: 4122,
    duration_s: 137.4,
    created_at: "2026-10-12T11:30:00+00:00",
  }),
];

// ---- jobs: a started job finishes after a few seconds; job-1 (the `running` state) never does ----
const startedAt = new Map<string, { at: number; kind: Job["kind"] }>();
let jobCounter = 0;
const JOB_MS = 3000;

function startJob(kind: Job["kind"]): Job {
  jobCounter += 1;
  const id = `job-${kind}-${jobCounter}`;
  startedAt.set(id, { at: Date.now(), kind });
  return {
    id,
    kind,
    status: "queued",
    progress: 0,
    message: "Waiting to start",
    result_id: null,
    error: null,
  };
}

export const runningJob: Job = {
  id: "job-1",
  kind: "evaluate",
  status: "running",
  progress: 0.4,
  message: "Replaying sessions",
  result_id: null,
  error: null,
};

function jobNow(id: string): Job | null {
  if (id === runningJob.id) return runningJob;
  const started = startedAt.get(id);
  if (!started) return null;
  const progress = Math.min(1, (Date.now() - started.at) / JOB_MS);
  const done = progress >= 1;
  return {
    id,
    kind: started.kind,
    status: done ? "done" : "running",
    progress,
    message: done ? "Finished" : started.kind === "train" ? "Training on landmarks" : "Replaying sessions",
    result_id: done && started.kind === "evaluate" ? (summaries[0]?.id ?? null) : null,
    error: null,
  };
}

const engineSocket = ws.link("ws://*/ws/engine");

const PROMPTS = [
  { prompt: "Hold up 3 fingers", gesture: "COUNT_3" },
  { prompt: "Rest, hands down", gesture: null },
  { prompt: "Hold up 4 fingers", gesture: "COUNT_4" },
  { prompt: "Show an open palm", gesture: "OPEN_PALM" },
] as const;

export const datasetHandlers = [
  http.get("/api/sessions", async () => {
    if (state() === "loading") await delay("infinite");
    if (state() === "error") return engineError();
    if (state() === "empty") return HttpResponse.json(onEvaluationPage() ? mockSessions.slice(-2, -1) : []);
    return HttpResponse.json(mockSessions);
  }),
  http.delete("/api/sessions/:id", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/recordings", async () => {
    if (state() === "replay") {
      return HttpResponse.json(
        { error: { code: "CAMERA_REQUIRED", message: "Recording needs the camera.", details: {} } },
        { status: 409 },
      );
    }
    await delay(600);
    return HttpResponse.json(examples.recording);
  }),
  http.post("/api/recordings/current/stop", async () => {
    await delay(400);
    return HttpResponse.json(
      session({
        id: "rec-2026-10-13-p5",
        kind: "gestures",
        participant: "p5",
        source: "recorded",
        luminance_mean: 121,
        n_frames: 1210,
        duration_s: 40.3,
      }),
    );
  }),
  http.get("/api/model", () => {
    if (state() === "empty" || state() === "ml-unavailable") {
      return HttpResponse.json(
        { error: { code: "NO_MODEL", message: "No trained model yet.", details: {} } },
        { status: 404 },
      );
    }
    return HttpResponse.json(examples.modelCard);
  }),
  http.post("/api/model/train", () => HttpResponse.json(startJob("train"), { status: 202 })),
  http.get("/api/jobs/:id", ({ params }) => {
    const job = jobNow(String(params.id));
    return job
      ? HttpResponse.json(job)
      : HttpResponse.json(
          { error: { code: "JOB_NOT_FOUND", message: "No such job.", details: {} } },
          { status: 404 },
        );
  }),
  // Events the recorder and the progress bar listen for, on top of the Phase 1 socket handler.
  engineSocket.addEventListener("connection", ({ client }) => {
    const timers: Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>> = [];
    const send = (event: object) => client.send(JSON.stringify({ type: "event", event }));
    if (state() === "recording") {
      let step = 3;
      const prompt = () => {
        const next = PROMPTS[(step - 3) % PROMPTS.length]!;
        send({
          kind: "recording_prompt",
          session_id: "rec-2026-10-12-p1",
          step,
          total_steps: 47,
          seconds: 4,
          ...next,
        });
        step += 1;
      };
      timers.push(setTimeout(prompt, 300), setInterval(prompt, 4000));
    }
    if (state() === "running")
      timers.push(setTimeout(() => send({ kind: "job_progress", job: runningJob }), 500));
    client.addEventListener("close", () =>
      timers.forEach((timer) => (clearTimeout(timer), clearInterval(timer))),
    );
  }),
];

export { startJob };
