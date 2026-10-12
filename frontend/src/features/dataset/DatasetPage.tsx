// Dataset: the sessions behind every number in the Evaluation lab, a guided recorder for adding
// more, and the pose classifier trained from them. Landmarks only, never video.
import { useQueryClient } from "@tanstack/react-query";
import { Circle, Database } from "lucide-react";
import { useState } from "react";
import { useEngineFrame } from "@/api/engineSocket";
import { ApiError, toMessage } from "@/api/errors";
import { useEngineSnapshot } from "@/api/queries";
import type { SessionSummary } from "@/api/types";
import {
  Button,
  Callout,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Section,
  Skeleton,
  SkeletonGroup,
  useToast,
} from "@/components/ui";
import { useSessions } from "@/features/live/api";
import { useModelCard } from "@/features/settings/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import {
  datasetKeys,
  useDeleteSession,
  useStartRecording,
  useStopRecording,
  useTrainModel,
  type RecordingRequest,
} from "./api";
import { useJob } from "./jobs";
import { formatCount, formatLength, plural } from "./labels";
import { ModelPanel } from "./ModelPanel";
import { RecordDialog } from "./RecordDialog";
import { RecorderView } from "./RecorderView";
import { SessionsTable } from "./SessionsTable";
import { trainingSources } from "./training";
import { useRecorder } from "./useRecorder";
import styles from "./DatasetPage.module.css";

export function DatasetPage() {
  useDocumentTitle("Dataset");
  const client = useQueryClient();
  const toast = useToast();
  const sessions = useSessions();
  const model = useModelCard();
  const snapshot = useEngineSnapshot();
  const frame = useEngineFrame();
  const recorder = useRecorder();

  const startRecording = useStartRecording();
  const stopRecording = useStopRecording();
  const deleteSession = useDeleteSession();
  const train = useTrainModel();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [toDelete, setToDelete] = useState<SessionSummary | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);

  const training = useJob("train", (job) => {
    void client.invalidateQueries({ queryKey: datasetKeys.model });
    if (job.status === "done") {
      toast.show({
        tone: "success",
        title: "Model trained",
        description: "Its macro-F1 is on the card below.",
      });
    } else {
      toast.show({
        tone: "danger",
        title: "Training failed",
        description: job.error ?? "The engine stopped training.",
      });
    }
  });

  const list = sessions.data ?? [];
  const plan = trainingSources(list);
  const blockedReason =
    sessions.data === undefined
      ? "Loading sessions."
      : plan.participants < 2
        ? `Training needs at least two participants. There ${plan.participants === 1 ? "is" : "are"} ${plan.participants} so far.`
        : null;

  function openDialog() {
    setDialogKey((key) => key + 1);
    setDialogOpen(true);
  }

  async function start(request: RecordingRequest) {
    const status = await startRecording.mutateAsync(request);
    recorder.begin({
      sessionId: status.session_id,
      step: status.step,
      totalSteps: status.total_steps,
      prompt: status.prompt,
    });
    setStopError(null);
    setDialogOpen(false);
  }

  function stop() {
    setStopError(null);
    stopRecording.mutate(undefined, {
      onSuccess: (saved) => {
        recorder.clear();
        toast.show({
          tone: "success",
          title: `Session saved for ${saved.participant}`,
          description: `${formatLength(saved.duration_s)} and ${formatCount(saved.n_frames)} frames of landmarks.`,
        });
      },
      onError: (error) => setStopError(toMessage(error)),
    });
  }

  function trainModel() {
    setTrainError(null);
    train.mutate(plan.sources, {
      onSuccess: training.track,
      onError: (error) => setTrainError(error instanceof ApiError ? error.message : toMessage(error)),
    });
  }

  return (
    <>
      <PageHeader
        title="Dataset"
        description={
          recorder.prompt
            ? "Recording. Follow the prompts; only hand landmarks are saved."
            : "Recorded landmark sessions for training and evaluation. Landmarks only, never video."
        }
        actions={
          recorder.prompt ? null : (
            <Button variant="primary" icon={Circle} onClick={openDialog}>
              Record session
            </Button>
          )
        }
      />
      <div className={styles.body}>
        {recorder.prompt ? (
          <>
            {stopError ? (
              <Callout tone="danger" title="The session was not saved" role="alert">
                {stopError}
              </Callout>
            ) : null}
            <RecorderView
              prompt={recorder.prompt}
              frame={frame}
              stopping={stopRecording.isPending}
              onStop={stop}
            />
          </>
        ) : (
          <>
            <Section title="Sessions" description={summarise(list)}>
              {sessions.isPending ? (
                <SessionsSkeleton />
              ) : sessions.isError ? (
                <ErrorState
                  headingLevel={3}
                  title="Sessions could not be loaded"
                  message={toMessage(sessions.error)}
                  onRetry={() => void sessions.refetch()}
                  retrying={sessions.isFetching}
                />
              ) : list.length === 0 ? (
                <EmptyState
                  icon={Database}
                  headingLevel={3}
                  title="No sessions yet"
                  body="Sessions are short recordings of hand landmarks, one per participant, distance and lighting. The model trains on them and the Evaluation lab scores them. Nothing is saved until you record one."
                  action={
                    <Button variant="primary" icon={Circle} onClick={openDialog}>
                      Record session
                    </Button>
                  }
                />
              ) : (
                <SessionsTable sessions={list} onDelete={setToDelete} />
              )}
            </Section>
            <ModelPanel
              model={model}
              job={training.job}
              onTrain={trainModel}
              starting={train.isPending}
              trainError={trainError}
              blockedReason={blockedReason}
            />
          </>
        )}
      </div>

      <RecordDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        replaying={snapshot.data?.source === "replay"}
        participants={[...new Set(list.map((session) => session.participant))]}
        onStart={start}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete session "${toDelete?.id ?? ""}"?`}
        confirmLabel="Delete session"
        pendingLabel="Deleting"
        pending={deleteSession.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deleteSession.mutate(toDelete.id, {
            onSuccess: () => {
              toast.show({ tone: "success", title: "Session deleted", description: toDelete.id });
              setToDelete(null);
            },
            onError: (error) =>
              toast.show({ tone: "danger", title: "Session not deleted", description: toMessage(error) }),
          });
        }}
      >
        Its landmarks are removed from this computer. Evaluations already run keep their results.
      </ConfirmDialog>
    </>
  );
}

function summarise(sessions: SessionSummary[]): string {
  if (sessions.length === 0) return "Newest first.";
  const people = new Set(sessions.map((session) => session.participant)).size;
  const frames = sessions.reduce((sum, session) => sum + session.n_frames, 0);
  return `${plural(sessions.length, "session")} from ${plural(people, "participant")}, ${formatCount(frames)} frames. Newest first.`;
}

/** A table's worth of rows, so the page does not jump when the list arrives. */
function SessionsSkeleton() {
  return (
    <SkeletonGroup label="Loading sessions">
      <div className={styles.skeleton}>
        <Skeleton shape="control" />
        <Skeleton shape="text" lines={6} />
      </div>
    </SkeletonGroup>
  );
}
