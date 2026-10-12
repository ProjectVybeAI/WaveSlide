// Phase 0 stand-in for Live: the raw landmarks from the engine, so the pipe is visibly working.
import { Activity } from "lucide-react";
import { useEngineFrame, useSocketStatus } from "@/api/engineSocket";
import { HandSkeleton } from "@/components/hand/HandSkeleton";
import { PlaceholderPage } from "@/components/shell/PlaceholderPage";
import { StatusPill } from "@/components/ui";
import { formatFps } from "@/lib/format";
import { POSE_LABEL } from "@/lib/poses";
import styles from "./LivePage.module.css";

export function LivePage() {
  const frame = useEngineFrame();
  const status = useSocketStatus();
  return (
    <PlaceholderPage
      title="Live"
      description="What the camera sees, what WaveSlide recognises, and every key it sends."
      icon={Activity}
      comingIn="Phase 1"
    >
      <figure className={styles.monitor} data-live={frame?.active ?? false}>
        <HandSkeleton hands={frame?.hands ?? []} extended={frame?.extended} />
        <figcaption className={styles.umd}>
          <span>{frame ? (frame.hands.length ? POSE_LABEL[frame.pose] : "No hand in view") : "Waiting"}</span>
          <span className={styles.dim}>
            {frame ? `${frame.source === "replay" ? "Replay" : "Camera"}, ${formatFps(frame.fps)}` : ""}
          </span>
        </figcaption>
      </figure>
      <p>
        <StatusPill tone={status === "open" ? "success" : status === "connecting" ? "info" : "danger"}>
          {status === "open" ? "Engine connected" : status === "connecting" ? "Connecting to the engine" : "Engine not reachable"}
        </StatusPill>
      </p>
    </PlaceholderPage>
  );
}
