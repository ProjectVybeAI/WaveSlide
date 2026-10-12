// The pose the recogniser sees, as words: "Three fingers" and, beside it, who decided and how sure
// ("Rules 0.94"). Sits in the UMD caption under the camera image.
import type { EngineFrame } from "@/api/types";
import { GESTURE_LABEL } from "./glyph";
import styles from "./PoseChip.module.css";

type Props = {
  frame: Pick<EngineFrame, "pose" | "recogniser" | "confidence" | "hands"> | null;
  /** Without a hand there is no pose: say so. */
  emptyLabel?: string;
};

export function PoseChip({ frame, emptyLabel = "No hand" }: Props) {
  const hasHand = Boolean(frame && frame.hands.length > 0);
  if (!frame || !hasHand) return <span className={styles.pose}>{emptyLabel}</span>;
  return (
    <>
      <span className={styles.pose}>{GESTURE_LABEL[frame.pose]}</span>
      <span className={styles.badge}>
        {frame.recogniser === "ml" ? "ML" : "Rules"} {frame.confidence.toFixed(2)}
      </span>
    </>
  );
}
