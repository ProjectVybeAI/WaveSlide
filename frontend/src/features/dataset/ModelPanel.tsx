// "Trained model": the card of the pose classifier (leave-one-participant-out macro-F1, poses,
// participants), the Train model button and, while it trains, the job's progress.
import { Brain } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { toMessage } from "@/api/errors";
import type { Job, ModelCard } from "@/api/types";
import { FigureStrip } from "@/components/charts";
import {
  Button,
  Callout,
  EmptyState,
  ErrorState,
  Section,
  Skeleton,
  SkeletonGroup,
  StatusPill,
} from "@/components/ui";
import { JobProgress } from "./JobProgress";
import { formatCount, formatWhen } from "./labels";
import styles from "./ModelPanel.module.css";

type Props = {
  model: UseQueryResult<ModelCard | null>;
  job: Job | null;
  onTrain: () => void;
  starting: boolean;
  /** A sentence when the engine refused to train (not enough participants), shown above the card. */
  trainError: string | null;
  /** Why Train model is unavailable, if it is. */
  blockedReason: string | null;
};

export function ModelPanel({ model, job, onTrain, starting, trainError, blockedReason }: Props) {
  const card = model.data;
  return (
    <Section
      title="Trained model"
      description="A random forest on hand landmarks, scored by leaving one participant out at a time."
      actions={
        <Button
          icon={Brain}
          variant={card ? "secondary" : "primary"}
          pending={starting || job !== null}
          pendingLabel="Training"
          disabled={blockedReason !== null}
          onClick={onTrain}
        >
          {card ? "Train again" : "Train model"}
        </Button>
      }
    >
      {blockedReason ? <p className={styles.reason}>{blockedReason}</p> : null}
      {trainError ? (
        <Callout tone="danger" title="The model was not trained" role="alert">
          {trainError}
        </Callout>
      ) : null}
      {job ? <JobProgress job={job} /> : null}
      {model.isPending ? (
        <SkeletonGroup label="Loading the trained model">
          <Skeleton shape="block" className={styles.skeleton} />
        </SkeletonGroup>
      ) : model.isError ? (
        <ErrorState
          headingLevel={3}
          title="The trained model could not be loaded"
          message={toMessage(model.error)}
          onRetry={() => void model.refetch()}
          retrying={model.isFetching}
        />
      ) : card ? (
        <div className={styles.card}>
          <FigureStrip
            label="Trained model"
            figures={[
              { value: card.lopo_macro_f1.toFixed(2), label: "Macro-F1, leave one participant out" },
              {
                value: formatCount(card.participants.length),
                label: `${card.participants.length === 1 ? "Participant" : "Participants"}: ${card.participants.join(", ")}`,
              },
              { value: formatCount(card.classes.length), label: "Poses it tells apart" },
              { value: formatCount(card.n_frames), label: "Frames it learned from" },
            ]}
          />
          <p className={styles.meta}>
            Trained {formatWhen(card.trained_at)}.
            {card.synthetic ? <StatusPill tone="warning">Synthetic data</StatusPill> : null}
          </p>
        </div>
      ) : (
        <EmptyState
          layout="inline"
          headingLevel={3}
          title="No trained model yet"
          body="Training needs recordings from at least two participants. Until then WaveSlide recognises poses with its rules."
        />
      )}
    </Section>
  );
}
