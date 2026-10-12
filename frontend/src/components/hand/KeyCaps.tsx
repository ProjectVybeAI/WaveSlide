// Key caps: the keys WaveSlide sends, in mono type (DESIGN.md: mono is for key caps and file names only).
import { clsx } from "clsx";
import { keyCaps } from "./keys";
import styles from "./KeyCaps.module.css";

type Props = {
  /** Keys as the engine sends them, in order: ["3", "enter"] or ["shift+command+enter"]. */
  keys: readonly string[];
  /** Replaces "{n}" in jump keys. */
  slide?: number | null;
  /** Shown when there are no keys (going live sends none). */
  empty?: string;
  className?: string;
};

export function KeyCaps({ keys, slide, empty = "none", className }: Props) {
  const caps = keys.flatMap((key) => keyCaps(key, slide));
  if (caps.length === 0) return <span className={styles.empty}>{empty}</span>;
  return (
    <span className={clsx(styles.keys, className)}>
      {caps.map((cap, index) => (
        <kbd key={index} className={styles.cap}>
          {cap}
        </kbd>
      ))}
    </span>
  );
}
