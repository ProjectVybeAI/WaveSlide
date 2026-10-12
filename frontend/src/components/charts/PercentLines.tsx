// Accuracy along an ordered condition (distance): one 2 px line per series, a marker on every
// point, the last point labelled, and an optional bar to clear (the 90% line). Values are shares 0..1.
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame, type LegendEntry } from "./ChartFrame";
import { ChartTooltip } from "./ChartTooltip";
import { percent, percentExact } from "./format";
import { twoLineTick } from "./ticks";
import styles from "./charts.module.css";

export type Series = { key: string; name: string; color: string };
/** One x position: its label, a second line under it, and one value per series (null = not measured). */
export type ConditionRow = { label: string; note?: string; values: Record<string, number | null> };

type Props = {
  rows: ConditionRow[];
  series: Series[];
  /** The line a good result must stay above, e.g. 0.9 with the label "90% bar". */
  threshold?: { value: number; label: string };
  summary: string;
  caption: string;
  /** The heading of the table's first column, e.g. "Distance". */
  conditionName: string;
};

export function PercentLines({ rows, series, threshold, summary, caption, conditionName }: Props) {
  const flat = rows.flatMap((row) => Object.values(row.values)).filter((v): v is number => v !== null);
  const low = Math.max(0, Math.floor((Math.min(...flat, 1) - 0.05) * 10) / 10);
  const ticks = Array.from(
    { length: Math.round((1 - low) * 10) + 1 },
    (_, i) => Math.round((low + i / 10) * 10) / 10,
  );
  const notes = new Map(rows.map((row) => [row.label, row.note]));
  const legend: LegendEntry[] = series.map((s) => ({ name: s.name, color: s.color, mark: "line" }));

  const data = rows.map((row) => ({ label: row.label, ...row.values }));
  return (
    <ChartFrame
      summary={summary}
      legend={legend}
      table={{
        caption,
        columns: [conditionName, ...series.map((s) => s.name)],
        rows: rows.map((row) => [
          row.note ? `${row.label}, ${row.note}` : row.label,
          ...series.map((s) => {
            const value = row.values[s.key];
            return value === null || value === undefined ? "not measured" : percentExact(value);
          }),
        ]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 56, bottom: 24, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tick={twoLineTick(notes)}
            tickLine={false}
            interval={0}
            padding={{ left: 24, right: 8 }}
          />
          <YAxis
            domain={[low, 1]}
            ticks={ticks}
            tickFormatter={percent}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          {threshold ? (
            <ReferenceLine
              y={threshold.value}
              className={styles.threshold}
              label={{ value: threshold.label, position: "right", className: styles.thresholdLabel }}
            />
          ) : null}
          <Tooltip
            isAnimationActive={false}
            cursor={{ className: styles.cursor }}
            content={(props) => <ChartTooltip {...props} format={percentExact} />}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              connectNulls
              isAnimationActive={false}
              dot={{ r: 4.5, fill: s.color, stroke: "var(--color-bg)", strokeWidth: 2 }}
              activeDot={{ r: 5.5, fill: s.color, stroke: "var(--color-bg)", strokeWidth: 2 }}
              label={({ x, y, index, value }) =>
                index === rows.length - 1 && typeof value === "number" ? (
                  <text className={styles.value} x={Number(x) + 12} y={Number(y)} dy="0.35em">
                    {percent(value)}
                  </text>
                ) : (
                  <g />
                )
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
