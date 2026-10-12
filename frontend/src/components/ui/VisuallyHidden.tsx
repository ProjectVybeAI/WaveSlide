// VisuallyHidden: text for screen readers only (an icon button's extra context, a live "Copied").
// A component rather than a global class, so the copied kit works without base.css.
import { clsx } from "clsx";
import type { HTMLAttributes } from "react";
import styles from "./VisuallyHidden.module.css";

export function VisuallyHidden({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...rest} className={clsx(styles.hidden, className)} />;
}
