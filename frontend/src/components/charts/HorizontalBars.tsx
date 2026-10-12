// One value per named row, as bars grown from a baseline on the left (ablation, false triggers per
// participant). The value sits at the bar's tip; the axis only names the unit.
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
import { ChartFrame } from "./ChartFrame";
import { ChartTooltip } from "./ChartTooltip";
import { figure } from "./format";
import styles from "./charts.module.css";

export type BarRow = { label: string; value: number };

type Props = {
  rows: BarRow[];
  /** The series' colour and the name the tooltip and table use for the value: "False triggers". */
  color: string;
  valueName: string;
  /** Under the axis: "false triggers per minute". */
  unit: string;
  /** Width reserved for the row labels, in chart units (about one per pixel). */
  labelColumn?: number;
  summary: string;
  caption: string;
};

const MAX_BAR = 20;

export function HorizontalBars({ rows, color, valueName, unit, labelColumn = 160, summary, caption }: Props) {
  const data = rows.map((row) => ({ label: row.label, value: row.value }));
  const axis = axisFor(Math.max(...rows.map((row) => row.value), 0));
  return (
    <ChartFrame
      summary={summary}
      barRows={rows.length}
      table={{
        caption,
        columns: ["Condition", `${valueName} (${unit})`],
        rows: rows.map((r) => [r.label, figure(r.value)]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
          barSize={MAX_BAR}
        >
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            domain={[0, axis.max]}
            ticks={axis.ticks}
            tickLine={false}
            axisLine={false}
            label={{ value: unit, position: "insideBottomRight", offset: -2, className: styles.axisUnit }}
            height={40}
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={labelColumn}
            className={styles.categoryAxis}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ className: styles.barCursor }}
            content={(props) => <ChartTooltip {...props} format={figure} />}
          />
          <Bar
            dataKey="value"
            name={valueName}
            fill={color}
            radius={[0, 3, 3, 0]}
            minPointSize={2}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              className={styles.value}
              formatter={(value: unknown) => (typeof value === "number" ? figure(value) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** The axis ends on a quarter, half or whole step above the largest value, so small rates keep their decimals. */
function axisFor(top: number): { max: number; ticks: number[] } {
  const step = top <= 1 ? 0.25 : top <= 2 ? 0.5 : 1;
  const max = Math.max(step, Math.ceil(top / step) * step);
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
}
