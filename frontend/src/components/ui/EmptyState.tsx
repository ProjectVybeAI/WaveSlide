// EmptyState: says what will appear here, why it is empty now, and the one action that fills it.
// For a filtered list: title "No leases match "Flat 4"", action = a clear-filters button.
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export type EmptyStateProps = {
  title: ReactNode;
  body?: ReactNode;
  /** One next step, usually a Button or a link styled with buttonClassName(). */
  action?: ReactNode;
  /** At most one simple line icon; leave it out rather than decorate. */
  icon?: LucideIcon;
  headingLevel?: 2 | 3;
  /** "region" draws a dashed frame for an empty page area; "inline" sits in a table or panel. */
  layout?: "region" | "inline";
  className?: string;
};

export function EmptyState({
  title,
  body,
  action,
  icon: Icon,
  headingLevel = 2,
  layout = "region",
  className,
}: EmptyStateProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={clsx(styles.empty, styles[layout], className)}>
      {Icon ? <Icon className={styles.icon} aria-hidden="true" /> : null}
      <Heading className={styles.title}>{title}</Heading>
      {body ? <p className={styles.body}>{body}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
