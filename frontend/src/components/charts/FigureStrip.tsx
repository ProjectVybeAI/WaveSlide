// A ruled strip of headline figures (not cards): a big tabular number, its unit, and one line saying
// what it is. Four or five fit across; it wraps to three, then two, as the window narrows.
import type { CSSProperties, ReactNode } from "react";
import styles from "./FigureStrip.module.css";

export type Figure = {
  /** The figure itself, already formatted: "0.91", "38". Use "–" when there is none. */
  value: ReactNode;
  unit?: string;
  /** What it measures, in the words the examiner would use. */
  label: ReactNode;
};

export function FigureStrip({ figures, label }: { figures: Figure[]; label: string }) {
  return (
    <dl
      className={styles.strip}
      aria-label={label}
      style={{ "--figure-count": figures.length } as CSSProperties}
    >
      {figures.map((figure, index) => (
        <div key={index} className={styles.item}>
          <dt>{figure.label}</dt>
          <dd>
            {figure.value}
            {figure.unit ? <small>{figure.unit}</small> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
