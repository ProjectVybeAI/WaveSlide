// Live: the setup check, the camera monitor with its tally edge, the cue panel, and the session's
// command log. This is where the examiner reads the pipeline: landmarks, pose, hold, key, latency.
import { PanelTop } from "lucide-react";
import { useEffect, useState } from "react";
import type { EngineFrame } from "@/api/types";
import { toMessage } from "@/api/errors";
import { useEngineSnapshot, useHealth } from "@/api/queries";
import { CameraView } from "@/components/hand/CameraView";
import { PoseChip } from "@/components/hand/PoseChip";
import { useCue } from "@/components/hand/useCue";
import { Button, ErrorState, PageHeader, Skeleton, SkeletonGroup } from "@/components/ui";
import { useSettings } from "@/features/settings/api";
import { SETTINGS_DEFAULTS } from "@/features/settings/settingsSchema";
import { formatClock } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useCameras, useProfiles, useSetOverlay } from "./api";
import { CommandLog } from "./CommandLog";
import { CuePanel } from "./CuePanel";
import { SetupCheck, SetupCheckSkeleton } from "./SetupCheck";
import { SourceSwitch } from "./SourceSwitch";
import { useCommandLog } from "./useCommandLog";
import styles from "./LivePage.module.css";

export function LivePage() {
  useDocumentTitle("Live");
  const health = useHealth();
  const snapshot = useEngineSnapshot();
  const settings = useSettings();
  const profiles = useProfiles();
  const cameras = useCameras();
  const showOverlay = useSetOverlay();

  const timing = settings.data?.timing ?? SETTINGS_DEFAULTS.timing;
  const { cue, frame, connected } = useCue({
    cooldownMs: timing.cooldown_ms,
    activationCooldownMs: timing.activation_cooldown_ms,
    seedCommand: snapshot.data?.last_command ?? null,
    cameraOk: snapshot.data?.camera_ok ?? true,
  });
  const log = useCommandLog(snapshot.data?.last_command);

  const failed = health.isError || snapshot.isError;
  const loading = !failed && (health.isPending || snapshot.isPending);
  const profileId = snapshot.data?.profile_id ?? settings.data?.profile_id ?? "powerpoint";
  const cameraIndex = settings.data?.camera?.index ?? 0;
  const replaying = snapshot.data?.source === "replay";
  const cameraOk = snapshot.data?.camera_ok ?? true;
  const live = frame?.active ?? snapshot.data?.active ?? false;
  const lastFrameAt = useLastFrameTime(frame, cameraOk);
  const keyToSlideMs = median(log.flatMap((entry) => (entry.ack_ms == null ? [] : [entry.ack_ms])));

  return (
    <>
      <PageHeader
        title="Live"
        description="What the camera sees, what WaveSlide recognises, and every key it sends."
        actions={
          <>
            <SourceSwitch snapshot={snapshot.data} />
            <Button
              icon={PanelTop}
              pending={showOverlay.isPending}
              onClick={() => showOverlay.mutate("full")}
            >
              Show overlay
            </Button>
          </>
        }
      />
      <div className={styles.body}>
        {failed ? (
          <ErrorState
            title="WaveSlide’s engine is not answering"
            message={toMessage(health.error ?? snapshot.error)}
            onRetry={() => {
              void health.refetch();
              void snapshot.refetch();
            }}
            retrying={health.isFetching || snapshot.isFetching}
          />
        ) : loading || !health.data ? (
          <LiveSkeleton />
        ) : (
          <>
            <SetupCheck
              health={health.data}
              profile={profiles.data?.find((profile) => profile.id === profileId)}
              profileId={profileId}
              camera={cameras.data?.find((camera) => camera.index === cameraIndex)}
              cameraOk={snapshot.data?.camera_ok ?? true}
              fps={frame?.fps ?? snapshot.data?.fps}
              replaySession={replaying ? (snapshot.data?.session_id ?? "") : null}
            />
            <div className={styles.grid}>
              <section aria-labelledby="monitor-title" className={styles.monitorColumn}>
                <h2 id="monitor-title" className="visually-hidden">
                  Camera
                </h2>
                <figure className={styles.monitor} data-live={live && connected && cameraOk}>
                  <div className={styles.picture}>
                    <CameraView frame={frame} size="large" mode={cameraOk ? "live" : "lost"} />
                  </div>
                  <figcaption className={styles.umd}>
                    <span className={styles.pose}>
                      {cameraOk ? (
                        <PoseChip
                          frame={frame}
                          emptyLabel={frame ? "No hand in view" : "Waiting for the engine"}
                        />
                      ) : (
                        <span className={styles.lost}>
                          {lastFrameAt === null
                            ? "No camera"
                            : `Last frame ${formatClock(lastFrameAt / 1000)}`}
                        </span>
                      )}
                    </span>
                    <span className={styles.source}>
                      {replaying
                        ? `Replay: ${snapshot.data?.session_id ?? "session"}`
                        : `Camera ${cameraIndex}, mirrored`}
                    </span>
                  </figcaption>
                </figure>
              </section>
              <section aria-labelledby="cue-title" className={styles.cuePanel}>
                <h2 id="cue-title" className="visually-hidden">
                  Now
                </h2>
                <CuePanel
                  cue={cue}
                  frame={frame}
                  snapshot={snapshot.data}
                  cameraOk={cameraOk}
                  keyToSlideMs={keyToSlideMs}
                />
              </section>
            </div>
            <CommandLog entries={log} profileId={profileId} />
          </>
        )}
      </div>
    </>
  );
}

/** When the last frame from a working camera arrived (wall clock, ms); the engine's own `t` is not a date. */
function useLastFrameTime(frame: EngineFrame | null, cameraOk: boolean): number | null {
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const hasFrame = frame !== null;
  const seq = frame?.seq;
  useEffect(() => {
    // While the camera is lost the frames are stale: keep the time of the last good one.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stamps a wall-clock time onto an external stream
    if (hasFrame && (cameraOk || seenAt === null)) setSeenAt(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seenAt is read only to keep the first time
  }, [seq, hasFrame, cameraOk]);
  return seenAt;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/** The same shapes as the loaded page: strip, monitor, panel, table rows. */
function LiveSkeleton() {
  return (
    <SkeletonGroup label="Loading the live view" className={styles.skeleton}>
      <SetupCheckSkeleton />
      <div className={styles.grid}>
        <Skeleton shape="block" className={styles.skeletonMonitor} />
        <div className={styles.skeletonPanel}>
          <Skeleton shape="block" className={styles.skeletonRing} />
          <Skeleton shape="text" lines={4} />
        </div>
      </div>
      <Skeleton shape="heading" width="1/4" />
      <Skeleton shape="text" lines={5} />
    </SkeletonGroup>
  );
}
