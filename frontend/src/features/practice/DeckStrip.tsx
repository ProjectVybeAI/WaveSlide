// The deck strip: ten thumbnails with the current one marked "Here now" and, after a jump, the
// slide it came from marked "Jumped from". The marker slides to the new slot (CSS, tokens only).
import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { SLIDES } from "./deck";
import styles from "./DeckStrip.module.css";

type Props = { current: number; from: number | null };

export function DeckStrip({ current, from }: Props) {
  return (
    <div className={styles.wrap}>
      {/* Wide screens: one marker that slides between slots. Narrow ones wrap to two rows, and the thumbnail carries the mark. */}
      <span className={styles.marker} style={{ "--slot": current - 1 } as CSSProperties} aria-hidden="true" />
      <ol className={styles.strip} aria-label="Slides in the practice deck">
        {SLIDES.map((slide, index) => {
          const number = index + 1;
          const isCurrent = number === current;
          const isFrom = number === from;
          return (
            <li
              key={number}
              className={clsx(styles.item, isCurrent && styles.current, isFrom && styles.from)}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className={styles.thumb}>{number}</span>
              <small className={styles.caption}>
                {isCurrent ? "Here now" : isFrom ? "Jumped from" : slide.strip}
              </small>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
