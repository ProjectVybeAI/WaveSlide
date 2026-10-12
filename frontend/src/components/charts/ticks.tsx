// An x-axis tick with a second, quieter line under the label ("1.5 m" over "hand found 98%").
// Returned as a plain function for Recharts' `tick` prop (it calls it for every tick).
import styles from "./charts.module.css";

export type TickProps = { x?: number | string; y?: number | string; payload?: { value?: string | number } };

export function twoLineTick(notes: Map<string, string | undefined>) {
  return ({ x = 0, y = 0, payload }: TickProps) => (
    <g transform={`translate(${x},${y})`}>
      <text className={styles.tick} textAnchor="middle" dy="1.4em">
        {payload?.value}
      </text>
      <text className={styles.tickNote} textAnchor="middle" dy="2.9em">
        {notes.get(String(payload?.value))}
      </text>
    </g>
  );
}
