// Follows one kind of background job (train or evaluate). Two sources tell it how the job is going:
// `job_progress` events from the engine's socket (also how a job started elsewhere shows up) and,
// once we hold a job, a poll of GET /api/jobs/{id}. Whichever is newer wins; the page just reads `job`.
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useEngineEvents } from "@/api/engineSocket";
import type { Job } from "@/api/types";
import { useJobPolling } from "./api";

export const isRunning = (job: Job | null): job is Job =>
  job !== null && (job.status === "queued" || job.status === "running");

export function useJob(kind: Job["kind"], onFinished: (job: Job) => void) {
  const [tracked, setTracked] = useState<Job | null>(null);
  const polled = useJobPolling(tracked);
  const job = tracked && polled.data?.id === tracked.id ? polled.data : tracked;

  useEngineEvents(
    useCallback(
      (event) => {
        if (event.kind === "job_progress" && event.job.kind === kind) setTracked(event.job);
      },
      [kind],
    ),
  );

  // Tell the page once per job when it ends, then let go of it so the progress bar disappears.
  const reported = useRef<string | null>(null);
  const finish = useEffectEvent((ended: Job) => {
    reported.current = ended.id;
    onFinished(ended);
    setTracked(null);
  });
  useEffect(() => {
    if (job && (job.status === "done" || job.status === "failed") && reported.current !== job.id) finish(job);
  }, [job]);

  return { job: isRunning(job) ? job : null, track: setTracked };
}
