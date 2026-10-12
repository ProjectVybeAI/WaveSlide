// Accuracy for a few unordered conditions (lighting): grouped columns grown from a 0% baseline,
// at most 24 px wide, 3 px rounded at the top, the value on each cap. Values are shares 0..1.
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame, type LegendEntry } from "./ChartFrame";
import { ChartTooltip } from "./ChartTooltip";
import { percent, percentExact } from "./format";
import type { ConditionRow, Series } from "./PercentLines";
import { twoLineTick } from "./ticks";
import styles from "./charts.module.css";

type Props = {
  rows: ConditionRow[];
  series: Series[];
  summary: string;
  caption: string;
  conditionName: string;
};

const TICKS = [0, 0.25, 0.5, 0.75, 1];
const MAX_BAR = 24;

export function PercentBars({ rows, series, summary, caption, conditionName }: Props) {
  const notes = new Map(rows.map((row) => [row.label, row.note]));
  const legend: LegendEntry[] = series.map((s) => ({ name: s.name, color: s.color, mark: "square" }));
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
        <BarChart
          data={data}
          margin={{ top: 20, right: 8, bottom: 24, left: 0 }}
          barGap={2}
          barSize={MAX_BAR}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tick={twoLineTick(notes)} tickLine={false} interval={0} />
          <YAxis
            domain={[0, 1]}
            ticks={TICKS}
            tickFormatter={percent}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ className: styles.barCursor }}
            content={(props) => <ChartTooltip {...props} format={percentExact} />}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={s.key}
                position="top"
                offset={6}
                className={styles.value}
                formatter={(value: unknown) =>
                  typeof value === "number" ? String(Math.round(value * 100)) : ""
                }
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
