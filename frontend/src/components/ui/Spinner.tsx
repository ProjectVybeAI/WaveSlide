// Spinner: a small inline "working" mark for buttons and sub-second waits. Never the
// loading state of a page or region (use Skeleton there, per ui-standards).
import { clsx } from "clsx";
import { LoaderCircle } from "lucide-react";
import { VisuallyHidden } from "./VisuallyHidden";
import styles from "./Spinner.module.css";

type SpinnerProps = {
  /** Spoken as a status ("Saving"). Leave out when the surrounding text already says it. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

export function Spinner({ label, size = "md", className }: SpinnerProps) {
  const icon = <LoaderCircle className={clsx(styles.spinner, styles[size], className)} aria-hidden="true" />;
  if (!label) return icon;
  return (
    <span role="status" className={styles.wrap}>
      {icon}
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  );
}
