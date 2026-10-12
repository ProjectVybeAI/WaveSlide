// Live: the setup check, the camera monitor with its tally edge, the cue panel, and the session's
// command log. This is where the examiner reads the pipeline: landmarks, pose, hold, key, latency.
import { PanelTop } from "lucide-react";
import { toMessage } from "@/api/errors";
import { useEngineSnapshot, useHealth } from "@/api/queries";
import { CameraView } from "@/components/hand/CameraView";
import { PoseChip } from "@/components/hand/PoseChip";
import { useCue } from "@/components/hand/useCue";
import { Button, ErrorState, PageHeader, Skeleton, SkeletonGroup } from "@/components/ui";
import { useSettings } from "@/features/settings/api";
import { SETTINGS_DEFAULTS } from "@/features/settings/settingsSchema";
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
  const live = frame?.active ?? snapshot.data?.active ?? false;

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
                <figure className={styles.monitor} data-live={live && connected}>
                  <div className={styles.picture}>
                    <CameraView frame={frame} size="large" />
                  </div>
                  <figcaption className={styles.umd}>
                    <PoseChip
                      frame={frame}
                      emptyLabel={frame ? "No hand in view" : "Waiting for the engine"}
                    />
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
                <CuePanel cue={cue} frame={frame} snapshot={snapshot.data} />
              </section>
            </div>
            <CommandLog entries={log} />
          </>
        )}
      </div>
    </>
  );
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
