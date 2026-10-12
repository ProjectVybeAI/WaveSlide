// KeyValue: labelled facts as a real description list (<dl>), so screen readers pair each
// label with its value. "inline": labels in one aligned column, values beside them (a record's
// details). "stacked": small label over value, flowing in columns (a summary strip).
import { clsx } from "clsx";
import type { ReactNode } from "react";
import styles from "./KeyValue.module.css";

export type KeyValueItem = {
  label: ReactNode;
  value: ReactNode;
  /** Tabular figures, so amounts in a list line up digit for digit. */
  numeric?: boolean;
  key?: string;
};

export type KeyValueProps = {
  items: KeyValueItem[];
  layout?: "inline" | "stacked";
  className?: string;
};

export function KeyValue({ items, layout = "inline", className }: KeyValueProps) {
  return (
    <dl className={clsx(styles.list, styles[layout], className)}>
      {items.map((item, index) => (
        <div className={styles.item} key={item.key ?? index}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={clsx(styles.value, item.numeric && styles.numeric)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
