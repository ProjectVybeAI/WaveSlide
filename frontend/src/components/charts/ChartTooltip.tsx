// The hover card every chart shares: the category, then one row per series with its colour mark.
// Text stays in text colours; only the small mark carries the series colour (dataviz rule).
import type { TooltipContentProps } from "recharts";
import styles from "./charts.module.css";

type Props = TooltipContentProps & {
  /** Writes a value: percent for accuracies, a plain figure for counts. */
  format: (value: number) => string;
  /** Overrides the category line, e.g. "1.5 m, hand found 98%". */
  title?: (label: string) => string;
};

export function ChartTooltip({ active, payload, label, format, title }: Props) {
  if (!active || payload.length === 0) return null;
  const heading = label === undefined ? "" : String(label);
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{title ? title(heading) : heading}</p>
      <ul className={styles.tooltipRows}>
        {payload.map((entry) =>
          typeof entry.value === "number" ? (
            <li key={String(entry.dataKey)}>
              <span
                className={styles.swatch}
                style={{ background: entry.color ?? entry.fill }}
                aria-hidden="true"
              />
              <span>{entry.name}</span>
              <strong>{format(entry.value)}</strong>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
