// Evaluation lab: every test from the brief (E1 to E8 and the ablation) replayed through the real
// pipeline, as numbers, charts and confusion matrices. Pick a run, read it, or start a new one.
import { useQueryClient } from "@tanstack/react-query";
import { Download, Play } from "lucide-react";
import { useId, useState } from "react";
import { toMessage } from "@/api/errors";
import type { EvaluationReport, EvaluationSummary } from "@/api/types";
import {
  Button,
  Callout,
  ErrorState,
  PageHeader,
  Select,
  Skeleton,
  SkeletonGroup,
  useToast,
} from "@/components/ui";
import { JobProgress } from "@/features/dataset/JobProgress";
import { useJob } from "@/features/dataset/jobs";
import { formatWhen } from "@/features/dataset/labels";
import { trainingSources } from "@/features/dataset/training";
import { useSessions } from "@/features/live/api";
import { useModelCard } from "@/features/settings/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { evaluationKeys, useEvaluation, useEvaluations, useStartEvaluation } from "./api";
import { EmptyRuns } from "./EmptyRuns";
import { ReportView } from "./ReportView";
import styles from "./EvaluationPage.module.css";

const runLabel = (run: EvaluationSummary) =>
  `${formatWhen(run.created_at)}, ${run.synthetic ? "synthetic" : "recorded"}`;

/** Saves the report on screen as a JSON file, built in the browser from what was already loaded. */
function downloadReport(report: EvaluationReport) {
  const file = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `waveslide-evaluation-${report.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function EvaluationPage() {
  useDocumentTitle("Evaluation lab");
  const client = useQueryClient();
  const toast = useToast();
  const pickerId = useId();
  const runs = useEvaluations();
  const sessions = useSessions();
  const model = useModelCard();
  const [picked, setPicked] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const list = runs.data ?? [];
  const newest = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const activeId = list.some((run) => run.id === picked) ? (picked ?? undefined) : newest[0]?.id;
  const report = useEvaluation(activeId);

  const startEvaluation = useStartEvaluation();
  const evaluating = useJob("evaluate", (job) => {
    void client.invalidateQueries({ queryKey: evaluationKeys.list });
    if (job.status === "done") {
      if (job.result_id) setPicked(job.result_id);
      toast.show({
        tone: "success",
        title: "Evaluation finished",
        description: "The new run is open below.",
      });
    } else {
      toast.show({
        tone: "danger",
        title: "Evaluation failed",
        description: job.error ?? "The engine stopped the run.",
      });
    }
  });

  function run(sources: ReturnType<typeof trainingSources>["sources"]) {
    setStartError(null);
    startEvaluation.mutate(sources, {
      onSuccess: evaluating.track,
      onError: (error) => setStartError(toMessage(error)),
    });
  }

  const busy = startEvaluation.isPending || evaluating.job !== null;
  const hasRuns = list.length > 0;

  return (
    <>
      <PageHeader
        title="Evaluation lab"
        description="Every test from the brief, replayed through the same pipeline that drives your slides."
        actions={
          hasRuns ? (
            <>
              <div className={styles.picker}>
                <label htmlFor={pickerId}>Run</label>
                <Select
                  id={pickerId}
                  value={activeId}
                  onValueChange={setPicked}
                  options={newest.map((item) => ({ value: item.id, label: runLabel(item) }))}
                />
              </div>
              <Button
                icon={Download}
                disabled={!report.data}
                onClick={() => report.data && downloadReport(report.data)}
              >
                Export report
              </Button>
              <Button
                variant="primary"
                icon={Play}
                pending={busy}
                pendingLabel="Running"
                onClick={() => run(trainingSources(sessions.data ?? []).sources)}
              >
                Run evaluation
              </Button>
            </>
          ) : null
        }
      />
      <div className={styles.body}>
        {startError ? (
          <Callout tone="danger" title="The evaluation did not start" role="alert">
            {startError}
          </Callout>
        ) : null}
        {evaluating.job ? <JobProgress job={evaluating.job} /> : null}
        {runs.isPending ? (
          <ReportSkeleton label="Loading evaluation runs" />
        ) : runs.isError ? (
          <ErrorState
            title="Evaluation runs could not be loaded"
            message={toMessage(runs.error)}
            onRetry={() => void runs.refetch()}
            retrying={runs.isFetching}
          />
        ) : !hasRuns ? (
          evaluating.job ? (
            <ReportSkeleton label="The first results will appear here when the run finishes" />
          ) : (
            <EmptyRuns
              sessions={sessions.data ?? null}
              hasModel={Boolean(model.data)}
              onTrySynthetic={() => run(["synthetic"])}
              starting={busy}
            />
          )
        ) : report.isPending ? (
          <ReportSkeleton label="Loading the report" />
        ) : report.isError ? (
          <ErrorState
            title="This report could not be loaded"
            message={toMessage(report.error)}
            onRetry={() => void report.refetch()}
            retrying={report.isFetching}
          />
        ) : (
          <ReportView report={report.data} />
        )}
      </div>
    </>
  );
}

/** The shapes of the report: figure strip, then a section with a chart. */
function ReportSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} className={styles.skeleton}>
      <Skeleton shape="control" width="1/2" />
      <Skeleton shape="block" className={styles.skeletonStrip} />
      <Skeleton shape="heading" width="1/3" />
      <Skeleton shape="block" className={styles.skeletonChart} />
    </SkeletonGroup>
  );
}
