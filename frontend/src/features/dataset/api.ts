// Dataset queries and mutations: recorded sessions, the guided recorder, the trained model and the
// background jobs (train, evaluate) the Dataset and Evaluation screens share. Typed from the contract.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";
import type { Job } from "@/api/types";
import { liveKeys } from "@/features/live/api";
import type { components } from "@/api/schema";

export type RecordingRequest = components["schemas"]["RecordingRequest"];
export type SourceChoice = components["schemas"]["TrainRequest"]["sources"];

export const datasetKeys = {
  sessions: liveKeys.sessions,
  model: ["model"] as const,
  job: (id: string) => ["job", id] as const,
};

export function useDeleteSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      unwrap(api.DELETE("/api/sessions/{session_id}", { params: { path: { session_id: sessionId } } })),
    onSuccess: () => client.invalidateQueries({ queryKey: datasetKeys.sessions }),
  });
}

/** Starts the guided recorder. The engine answers 409 CAMERA_REQUIRED while it replays a session. */
export function useStartRecording() {
  return useMutation({
    mutationFn: (request: RecordingRequest) => unwrap(api.POST("/api/recordings", { body: request })),
  });
}

/** Stops the recorder and saves what was recorded so far; answers with the new session. */
export function useStopRecording() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/recordings/current/stop")),
    onSuccess: () => client.invalidateQueries({ queryKey: datasetKeys.sessions }),
  });
}

/** Trains the pose classifier. Returns the job to follow; 422 NOT_ENOUGH_DATA below two participants. */
export function useTrainModel() {
  return useMutation({
    mutationFn: (sources: SourceChoice) => unwrap(api.POST("/api/model/train", { body: { sources } })),
  });
}

/** One background job, polled while it is queued or running. */
export function useJobPolling(job: Job | null) {
  return useQuery({
    queryKey: datasetKeys.job(job?.id ?? ""),
    queryFn: () => unwrap(api.GET("/api/jobs/{job_id}", { params: { path: { job_id: job?.id ?? "" } } })),
    enabled: job !== null && (job.status === "queued" || job.status === "running"),
    refetchInterval: 700,
  });
}
