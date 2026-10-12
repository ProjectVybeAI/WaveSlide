// The overlay window (340 x 280, or the 220 x 56 strip): a tally band that says whether gestures act,
// the camera with the counted hand, the cue dial with its target, and the last command with its latency.
// Read from 2 m: only the band and the dial's numeral are big. See docs/DESIGN.md "Overlay (hero)".
import { clsx } from "clsx";
import { CameraOff, EyeOff, Minimize2, Pause, Play, RotateCw, ServerOff } from "lucide-react";
import { useState } from "react";
import { useEngineSnapshot } from "@/api/queries";
import { CameraView } from "@/components/hand/CameraView";
import { commandLabel, describeCue } from "@/components/hand/cue";
import { HoldRing } from "@/components/hand/HoldRing";
import { KeyCaps } from "@/components/hand/KeyCaps";
import { PoseChip } from "@/components/hand/PoseChip";
import { useCue } from "@/components/hand/useCue";
import { Skeleton, SkeletonGroup } from "@/components/ui";
import { useSetActive, useSetOverlay } from "@/features/live/api";
import { useSettings } from "@/features/settings/api";
import { profileName, SETTINGS_DEFAULTS } from "@/features/settings/settingsSchema";
import { GESTURE_LABEL } from "@/components/hand/glyph";
import { formatMs } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { CompactOverlay } from "./CompactOverlay";
import { useNarrowWindow } from "./useNarrowWindow";
import styles from "./OverlayPage.module.css";

type Band = "live" | "paused" | "blocked" | "error";

export function OverlayPage() {
  useDocumentTitle("Overlay");
  const settings = useSettings();
  const snapshot = useEngineSnapshot();
  const setActive = useSetActive();
  const setOverlay = useSetOverlay();
  const narrow = useNarrowWindow();
  const [compactChoice, setCompactChoice] = useState<boolean | null>(null);

  const values = settings.data;
  const timing = values?.timing ?? SETTINGS_DEFAULTS.timing;
  const state = useCue({
    cooldownMs: timing.cooldown_ms,
    activationCooldownMs: timing.activation_cooldown_ms,
    seedCommand: snapshot.data?.last_command ?? null,
    cameraOk: snapshot.data?.camera_ok ?? true,
  });
  const { cue, frame, lastCommand, fresh, lastBlocked } = state;

  const live = frame?.active ?? snapshot.data?.active ?? false;
  const profile = profileName(snapshot.data?.profile_id ?? values?.profile_id);
  const goLiveGesture =
    GESTURE_LABEL[values?.mappings?.toggle_active ?? SETTINGS_DEFAULTS.mappings.toggle_active];
  const holdSeconds = (timing.hold_pose_ms / 1000).toFixed(1).replace(".0", "");

  const band: { kind: Band; word: string; sub: string; short: string } = (() => {
    if (cue.mode === "connecting") return { kind: "paused", word: "Connecting", sub: "", short: "" };
    if (cue.mode === "error")
      return { kind: "error", word: "No engine", sub: "Start WaveSlide again", short: "Not running" };
    if (cue.mode === "camera")
      return { kind: "error", word: "No camera", sub: "Gestures are off", short: "Gestures off" };
    if (cue.mode === "blocked")
      return { kind: "blocked", word: "Not sent", sub: "Click your slides first", short: "Focus" };
    if (!live)
      return {
        kind: "paused",
        word: "Paused",
        sub: `${goLiveGesture} ${holdSeconds} s to go live`,
        short: goLiveGesture,
      };
    return { kind: "live", word: "Live", sub: profile, short: profile };
  })();

  const compact = narrow || (compactChoice ?? values?.overlay?.compact ?? false);
  const chooseCompact = (next: boolean) => {
    setCompactChoice(next);
    setOverlay.mutate(next ? "compact" : "full");
  };

  if (compact) {
    return (
      <CompactOverlay
        band={band}
        cue={cue}
        lastCommand={lastCommand}
        lastBlocked={lastBlocked}
        onExpand={() => chooseCompact(false)}
      />
    );
  }

  const showsError = cue.mode === "error" || cue.mode === "camera";
  const cooling = cue.mode === "cooldown" ? cue.ring.cooldown : null;

  return (
    <section className={styles.overlay} data-band={band.kind} aria-label={`WaveSlide overlay, ${band.word}`}>
      <header className={styles.band}>
        <span className={styles.lamp} aria-hidden="true" />
        <p className={styles.word}>{band.word}</p>
        <p className={styles.sub}>{band.sub}</p>
        <div className={styles.tools}>
          <button
            type="button"
            className={styles.tool}
            aria-label={live ? "Pause gestures" : "Go live"}
            disabled={cue.mode === "error" || cue.mode === "connecting" || setActive.isPending}
            onClick={() => setActive.mutate(!live)}
          >
            {live ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-label="Make the overlay compact"
            onClick={() => chooseCompact(true)}
          >
            <Minimize2 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-label="Hide the overlay"
            onClick={() => setOverlay.mutate("hidden")}
          >
            <EyeOff size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      {showsError ? (
        <div className={styles.error} role="alert">
          {cue.mode === "camera" ? (
            <CameraOff size={20} aria-hidden="true" />
          ) : (
            <ServerOff size={20} aria-hidden="true" />
          )}
          <p className={styles.errorTitle}>
            {cue.mode === "camera" ? "Camera unavailable" : "WaveSlide is not running"}
          </p>
          <p className={styles.errorText}>
            {cue.mode === "camera"
              ? "Another app may be using it, or it was unplugged. WaveSlide retries every 2 s."
              : "This window reconnects by itself once WaveSlide is started again."}
          </p>
          <button type="button" className={styles.retry} onClick={() => void snapshot.refetch()}>
            <RotateCw size={16} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : cue.mode === "connecting" ? (
        <SkeletonGroup label="Connecting to the engine" className={styles.body}>
          <div className={styles.cam}>
            <Skeleton shape="block" className={styles.skeletonCam} />
          </div>
          <div className={styles.cue}>
            <Skeleton shape="circle" className={styles.skeletonRing} />
            <Skeleton shape="heading" width="1/2" />
            <Skeleton shape="text" lines={2} />
          </div>
        </SkeletonGroup>
      ) : (
        <div className={styles.body}>
          <figure className={styles.cam}>
            <div className={styles.picture}>
              <CameraView
                frame={frame}
                size="small"
                showImage={values?.overlay?.show_preview ?? true}
                showLandmarks={values?.overlay?.show_landmarks ?? true}
              />
            </div>
            <figcaption className={styles.umd}>
              <PoseChip frame={frame} emptyLabel={frame ? "No hand" : "Waiting"} />
            </figcaption>
          </figure>
          <div className={styles.cue}>
            <HoldRing
              state={cue.ring.state}
              progress={cue.ring.progress}
              holdMs={cue.ring.holdMs}
              label={cue.ring.label}
              caption={cue.ring.caption}
              cooldown={cue.ring.cooldown}
              size={104}
              description={describeCue(cue)}
            />
            <div aria-live="polite" className={styles.words}>
              <p className={styles.cueWord}>{cue.word}</p>
              <p className={styles.cueTarget}>{cue.target}</p>
            </div>
            {cue.mode === "standby" ? <p className={styles.cueDetail}>{cue.detail}</p> : null}
          </div>
        </div>
      )}

      <footer
        key={lastCommand?.id ?? "none"}
        className={clsx(styles.last, fresh && styles.fresh, lastBlocked && styles.blocked)}
      >
        {lastCommand ? (
          <>
            <span className={styles.label}>Last</span>
            <span className={styles.action}>{commandLabel(lastCommand)}</span>
            {lastCommand.keys.length > 0 ? (
              <KeyCaps keys={lastCommand.keys} slide={lastCommand.slide} />
            ) : null}
            <span className={styles.latency}>
              {lastBlocked ? "blocked" : formatMs(lastCommand.pipeline_ms)}
            </span>
          </>
        ) : (
          <span className={styles.label}>Nothing sent yet</span>
        )}
      </footer>
      {cooling !== null ? (
        <div className={styles.cooldown} aria-hidden="true">
          <span style={{ width: `${cooling * 100}%` }} />
        </div>
      ) : null}
    </section>
  );
}
