// MSW handlers for the Evaluation lab. Open /evaluation?state=<name>:
//   default / synthetic-data   two runs, the newest a full synthetic report
//   empty                      no runs yet (the screen lists what a real run needs)
//   running                    runs plus an evaluation job at 40%, announced over the socket
//   loading / error            as everywhere
// Register with `...evaluationHandlers` first in src/mocks/handlers.ts, after `...datasetHandlers`.
import { delay, http, HttpResponse } from "msw";
import { startJob } from "@/features/dataset/mocks";
import { fullReport, reportWithoutModel, summaries } from "./fixtures";

const state = () => new URLSearchParams(window.location.search).get("state") ?? "default";

const notFound = (code: string, message: string) =>
  HttpResponse.json({ error: { code, message, details: {} } }, { status: 404 });

async function guard(): Promise<Response | null> {
  if (state() === "loading") await delay("infinite");
  if (state() === "error") {
    return HttpResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "The WaveSlide engine stopped responding.", details: {} } },
      { status: 500 },
    );
  }
  return null;
}

export const evaluationHandlers = [
  http.get(
    "/api/evaluations",
    async () => (await guard()) ?? HttpResponse.json(state() === "empty" ? [] : summaries),
  ),
  http.get("/api/evaluations/:id", async ({ params }) => {
    const failed = await guard();
    if (failed) return failed;
    const report = [fullReport, reportWithoutModel].find((candidate) => candidate.id === params.id);
    return report ? HttpResponse.json(report) : notFound("EVALUATION_NOT_FOUND", "No such evaluation.");
  }),
  http.post("/api/evaluations", () => HttpResponse.json(startJob("evaluate"), { status: 202 })),
];
