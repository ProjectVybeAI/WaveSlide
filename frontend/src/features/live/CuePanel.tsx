// The cue panel beside the monitor: the dial at 168 px with its state word, what the recogniser sees,
// and the engine's figures. The words in the first block are announced; the changing figures are not.
import { describeCue, recogniserName, type Cue } from "@/components/hand/cue";
import { HoldRing } from "@/components/hand/HoldRing";
import { GESTURE_LABEL } from "@/components/hand/glyph";
import { KeyValue, Skeleton } from "@/components/ui";
import { AGREEMENT_WINDOW, useReadings } from "@/components/hand/readings";
import type { EngineFrame, EngineSnapshot } from "@/api/types";
import { formatFps } from "@/lib/format";
import styles from "./CuePanel.module.css";

const FINGER_NAMES = ["thumb", "index", "middle", "ring", "little"] as const;
/** In counting order: index, middle, ring, little, thumb. */
const COUNT_ORDER = [1, 2, 3, 4, 0] as const;

function extendedText(extended: boolean[] | null): string {
  if (!extended) return "";
  const names = COUNT_ORDER.filter((finger) => extended[finger]).map((finger) => FINGER_NAMES[finger]);
  return names.length === 0 ? "no finger extended" : `${names.join(", ")} extended`;
}

type Props = {
  cue: Cue;
  frame: EngineFrame | null;
  snapshot: EngineSnapshot | undefined;
  /** False when the camera is lost: the frame is the last one, so no reading is current. */
  cameraOk: boolean;
  /** Median key-to-slide time from the practice deck's acknowledgements; null until one arrives. */
  keyToSlideMs: number | null;
};

const NONE = "—";

export function CuePanel({ cue, frame, snapshot, cameraOk, keyToSlideMs }: Props) {
  const readings = useReadings(cameraOk ? frame : null);
  const hands = cameraOk ? (frame?.hands.length ?? 0) : 0;
  const fps = cameraOk ? (frame?.fps ?? snapshot?.fps) : undefined;
  return (
    <div className={styles.panel}>
      <div className={styles.now}>
        <HoldRing
          state={cue.ring.state}
          progress={cue.ring.progress}
          holdMs={cue.ring.holdMs}
          label={cue.ring.label}
          caption={cue.ring.caption}
          cooldown={cue.ring.cooldown}
          size={168}
          description={describeCue(cue)}
        />
        <div className={styles.words}>
          <div aria-live="polite">
            <p className={styles.word}>{cue.word}</p>
            <p className={styles.target}>{cue.target}</p>
          </div>
          {cue.detail ? <p className={styles.detail}>{cue.detail}</p> : null}
        </div>
      </div>

      <section aria-labelledby="sees-title">
        <h2 id="sees-title" className={styles.title}>
          What the recogniser sees
        </h2>
        {frame ? (
          <KeyValue
            items={[
              {
                label: "Pose",
                value: !cameraOk ? (
                  NONE
                ) : hands > 0 ? (
                  <>
                    {GESTURE_LABEL[frame.pose]}{" "}
                    <span className={styles.muted}>{extendedText(frame.extended)}</span>
                  </>
                ) : (
                  "No hand in view"
                ),
              },
              {
                label: "Confidence",
                numeric: true,
                value:
                  cameraOk && hands > 0 ? (
                    <>
                      {frame.confidence.toFixed(2)}{" "}
                      <span className={styles.muted}>{recogniserName(frame.recogniser).toLowerCase()}</span>
                    </>
                  ) : (
                    NONE
                  ),
              },
              {
                label: "Agreement",
                numeric: true,
                value:
                  readings.agreement === null
                    ? NONE
                    : `${readings.agreement} of last ${AGREEMENT_WINDOW} frames`,
              },
              {
                label: "Palm speed",
                numeric: true,
                value: readings.speed === null ? NONE : `${readings.speed.toFixed(1)} hand lengths/s`,
              },
              {
                label: "Finger spread",
                numeric: true,
                value: readings.spread === null ? NONE : `${readings.spread.toFixed(2)} hand lengths`,
              },
              {
                label: "Hands",
                numeric: true,
                value: !cameraOk ? NONE : hands === 0 ? "None" : `${hands} in view`,
              },
              { label: "Recogniser", value: recogniserName(frame.recogniser) },
            ]}
          />
        ) : (
          <Skeleton shape="text" lines={4} />
        )}
      </section>

      <section aria-labelledby="engine-title">
        <h2 id="engine-title" className={styles.title}>
          Engine
        </h2>
        <dl className={styles.figures}>
          <div>
            <dt className={styles.figureLabel}>{snapshot?.source === "replay" ? "Replay" : "Camera"}</dt>
            <dd className={styles.figure}>
              {fps ? fps.toFixed(1) : NONE}
              <small>fps</small>
            </dd>
          </div>
          <div>
            <dt className={styles.figureLabel}>Capture to key, p50</dt>
            <dd className={styles.figure}>
              {snapshot?.pipeline_ms_p50 ? Math.round(snapshot.pipeline_ms_p50) : NONE}
              <small>ms</small>
            </dd>
          </div>
          <div>
            <dt className={styles.figureLabel}>Key to slide, p50</dt>
            <dd className={styles.figure}>
              {keyToSlideMs === null ? NONE : Math.round(keyToSlideMs)}
              {keyToSlideMs === null ? null : <small>ms</small>}
            </dd>
          </div>
        </dl>
        <p className={styles.note}>
          {fps && fps < 20
            ? `Below 20 fps (${formatFps(fps)}): gestures may feel late. Close other apps that use the camera.`
            : null}
        </p>
      </section>
    </div>
  );
}
