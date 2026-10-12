// The guided recorder, full width: what to do now in large type, a countdown on the cue dial, the
// live skeleton so the person can see they are being tracked, progress through the protocol and Stop.
// Only landmarks are saved; the caption under the monitor says so.
import { Square } from "lucide-react";
import type { EngineFrame } from "@/api/types";
import { CameraView } from "@/components/hand/CameraView";
import { GESTURE_LABEL } from "@/components/hand/glyph";
import { HoldRing } from "@/components/hand/HoldRing";
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { Button } from "@/components/ui";
import { plural } from "./labels";
import { secondsLeft, useNow, type RecorderPrompt } from "./useRecorder";
import styles from "./RecorderView.module.css";

type Props = {
  prompt: RecorderPrompt;
  frame: EngineFrame | null;
  stopping: boolean;
  onStop: () => void;
};

export function RecorderView({ prompt, frame, stopping, onStop }: Props) {
  const now = useNow(100);
  const left = secondsLeft(prompt, now);
  const lastStep = prompt.step >= prompt.totalSteps;
  const finished = lastStep && left === 0;
  const stepProgress = prompt.seconds && left !== null ? 1 - left / prompt.seconds : 0;
  const done = finished ? prompt.totalSteps : prompt.step - 1 + stepProgress;

  return (
    <div className={styles.recorder}>
      <figure className={styles.monitor}>
        <div className={styles.picture}>
          <CameraView frame={frame} size="large" />
        </div>
        <figcaption className={styles.umd}>
          <span>{frame?.hands.length ? "Hand tracked" : "No hand in view"}</span>
          <span className={styles.note}>Landmarks only, no video is saved</span>
        </figcaption>
      </figure>

      <section className={styles.cue} aria-labelledby="recorder-prompt">
        <p className={styles.step}>
          Step {prompt.step} of {prompt.totalSteps}
        </p>
        <div aria-live="polite" aria-atomic="true">
          <h2 id="recorder-prompt" className={styles.prompt}>
            {finished ? "Protocol finished" : prompt.prompt}
          </h2>
        </div>
        <div className={styles.dialRow}>
          <HoldRing
            size={168}
            state={finished ? "go" : left === null ? "idle" : "standby"}
            progress={stepProgress}
            holdMs={1000}
            label={finished ? "Done" : left === null ? "" : String(Math.ceil(left))}
            caption={finished || left === null ? "" : "Seconds"}
            description={
              finished
                ? "Protocol finished"
                : left === null
                  ? "Waiting for the first step"
                  : `${Math.ceil(left)} seconds left in this step`
            }
          />
          {prompt.gesture && !finished ? (
            <div className={styles.pose}>
              <PoseGlyph pose={prompt.gesture} size={96} />
              <span>{GESTURE_LABEL[prompt.gesture]}</span>
            </div>
          ) : null}
        </div>
        <div className={styles.progress}>
          <progress value={done} max={prompt.totalSteps} aria-label="Progress through the protocol" />
          <p>{plural(Math.floor(done), "step")} done</p>
        </div>
        <Button
          icon={Square}
          variant={finished ? "primary" : "secondary"}
          pending={stopping}
          pendingLabel="Saving session"
          onClick={onStop}
        >
          {finished ? "Save session" : "Stop and save"}
        </Button>
        {finished ? null : <p className={styles.help}>Stopping early keeps what was recorded so far.</p>}
      </section>
    </div>
  );
}
