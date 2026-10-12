// Evaluation queries: the list of runs, one run's report, and starting a new run (a background job
// that the screen follows with `useJob`, see features/dataset/jobs.ts). Typed from the contract.
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/api/client";
import type { SourceChoice } from "@/features/dataset/api";

export const evaluationKeys = {
  list: ["evaluations"] as const,
  report: (id: string) => ["evaluations", id] as const,
};

export function useEvaluations() {
  return useQuery({ queryKey: evaluationKeys.list, queryFn: () => unwrap(api.GET("/api/evaluations")) });
}

export function useEvaluation(id: string | undefined) {
  return useQuery({
    queryKey: evaluationKeys.report(id ?? ""),
    queryFn: () =>
      unwrap(api.GET("/api/evaluations/{evaluation_id}", { params: { path: { evaluation_id: id ?? "" } } })),
    enabled: id !== undefined,
  });
}

/** Starts a run. The engine answers 202 with the job, 422 NOT_ENOUGH_DATA or 409 JOB_RUNNING. */
export function useStartEvaluation() {
  return useMutation({
    mutationFn: (sources: SourceChoice) =>
      unwrap(api.POST("/api/evaluations", { body: { sources, include_ml: true } })),
  });
}
