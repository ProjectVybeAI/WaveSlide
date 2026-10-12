// The camera monitor picture: the mirrored MJPEG preview (camera source only) under the counted
// hand. With no image (replay, preview off, camera lost) the skeleton sits alone on the video colour.
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
};

export function CameraView({ frame, showImage = true, showLandmarks = true, size = "large" }: Props) {
  const source = frame?.source;
  return (
    <div className={styles.view}>
      {/* Keyed by source: a failed preview is retried when the engine switches back to the camera. */}
      {showImage && source === "camera" ? <Preview key={source} /> : null}
      {showLandmarks ? (
        <HandSkeleton
          hands={frame?.hands ?? []}
          extended={frame?.extended}
          size={size}
          className={styles.skeleton}
        />
      ) : null}
    </div>
  );
}

function Preview() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img className={styles.image} src="/api/preview.mjpg" alt="" onError={() => setFailed(true)} />;
}
