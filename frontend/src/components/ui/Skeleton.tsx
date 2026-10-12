// Skeleton: a placeholder shaped like the content that is loading, so nothing jumps when the
// data lands. Wrap a group in <SkeletonGroup label="Loading leases"> so screen readers hear one
// "Loading" instead of a pile of empty shapes.
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { VisuallyHidden } from "./VisuallyHidden";
import styles from "./Skeleton.module.css";

export type SkeletonProps = {
  /** text/heading: one line of that type size; control: a button or input; block: a card or chart;
      circle: an avatar or mark. */
  shape?: "text" | "heading" | "control" | "block" | "circle";
  width?: "full" | "3/4" | "1/2" | "1/3" | "1/4";
  /** Several text lines; the last one is shorter, like a real paragraph. */
  lines?: number;
  className?: string;
};

const WIDTHS = { full: styles.wFull, "3/4": styles.w34, "1/2": styles.w12, "1/3": styles.w13, "1/4": styles.w14 };

export function Skeleton({ shape = "text", width = "full", lines = 1, className }: SkeletonProps) {
  if (shape === "text" && lines > 1) {
    return (
      <span className={clsx(styles.lines, className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={clsx(styles.skeleton, styles.text, index === lines - 1 ? styles.w34 : WIDTHS[width])}
          />
        ))}
      </span>
    );
  }
  return <span aria-hidden="true" className={clsx(styles.skeleton, styles[shape], WIDTHS[width], className)} />;
}

export function SkeletonGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <VisuallyHidden>{label}</VisuallyHidden>
      {children}
    </div>
  );
}
