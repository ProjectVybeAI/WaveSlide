// Phase 0 overlay: the tally band and the raw landmarks. Phase 1 adds the cue dial, the last
// command, cooldown and every state in docs/DESIGN.md.
import { useEngineFrame, useSocketStatus } from "@/api/engineSocket";
import { HandSkeleton } from "@/components/hand/HandSkeleton";
import { formatFps } from "@/lib/format";
import { POSE_LABEL } from "@/lib/poses";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import styles from "./OverlayPage.module.css";

export function OverlayPage() {
  useDocumentTitle("Overlay");
  const frame = useEngineFrame();
  const status = useSocketStatus();
  const live = frame?.active ?? false;
  const state = status !== "open" ? "error" : live ? "live" : "paused";

  return (
    <section className={styles.overlay} data-state={state} aria-label="WaveSlide overlay">
      <header className={styles.band}>
        <span className={styles.lamp} aria-hidden="true" />
        <p className={styles.word} aria-live="polite">
          {state === "error" ? "No engine" : live ? "Live" : "Paused"}
        </p>
        <p className={styles.sub}>
          {state === "error" ? "Start WaveSlide again" : live ? "Gestures act" : "Thumbs up 1 s to go live"}
        </p>
      </header>
      <figure className={styles.cam}>
        <HandSkeleton hands={frame?.hands ?? []} extended={frame?.extended} />
        <figcaption className={styles.umd}>
          <span>{frame?.hands.length ? POSE_LABEL[frame.pose] : "No hand"}</span>
          <span>{frame ? formatFps(frame.fps) : ""}</span>
        </figcaption>
      </figure>
      <footer className={styles.last}>
        <span className={styles.label}>Last</span>
        <span>Nothing sent yet</span>
      </footer>
    </section>
  );
}
