// The camera monitor picture: the mirrored MJPEG preview (camera source only) under the counted
// hand. With no image (replay, preview off, camera lost) the skeleton sits alone on the video colour.
import { clsx } from "clsx";
import { useState } from "react";
import type { EngineFrame } from "@/api/types";
import { HandSkeleton } from "./HandSkeleton";
import styles from "./CameraView.module.css";

type Props = {
  frame: EngineFrame | null;
  /** Show the camera image under the landmarks (settings.overlay.show_preview on the overlay). */
  showImage?: boolean;
  /** Draw the landmarks (settings.overlay.show_landmarks on the overlay). */
  showLandmarks?: boolean;
  size?: "small" | "large";
  /** "paused": plain grey bones, no numbers. "lost": the camera is gone, so the last frame is shown in grey. */
  mode?: "live" | "paused" | "lost";
};

export function CameraView({
  frame,
  showImage = true,
  showLandmarks = true,
  size = "large",
  mode = "live",
}: Props) {
  const source = frame?.source;
  return (
    <div className={styles.view}>
      {/* Keyed by source: a failed preview is retried when the engine switches back to the camera. */}
      {showImage && source === "camera" ? <Preview key={source} grey={mode === "lost"} /> : null}
      {showLandmarks ? (
        <HandSkeleton
          hands={frame?.hands ?? []}
          extended={frame?.extended}
          size={size}
          muted={mode !== "live"}
          className={styles.skeleton}
        />
      ) : null}
    </div>
  );
}

function Preview({ grey }: { grey: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      className={clsx(styles.image, grey && styles.grey)}
      src="/api/preview.mjpg"
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
