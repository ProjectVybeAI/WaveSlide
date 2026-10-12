// The frame every chart sits in: a legend (always, for two or more series), the plot, and the same
// numbers as a table for screen readers. The plot is an image with a one-sentence summary; the
// table next to it is what a screen reader reads (dataviz: "a table view exists").
import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";
import styles from "./charts.module.css";

export type LegendEntry = { name: string; color: string; mark?: "square" | "line" };

export type ChartTable = {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

type Props = {
  /** What the chart shows, in one sentence: "Accuracy by distance: rules fall from 97% to 76%." */
  summary: string;
  legend?: LegendEntry[];
  table: ChartTable;
  size?: "short" | "normal";
  /** A bar chart with one row per bar: the plot is as tall as its rows need, not a fixed height. */
  barRows?: number;
  children: ReactNode;
};

export function ChartFrame({ summary, legend, table, size = "normal", barRows, children }: Props) {
  return (
    <figure className={styles.frame}>
      {legend && legend.length > 1 ? (
        <ul className={styles.legend}>
          {legend.map((entry) => (
            <li key={entry.name}>
              <span
                className={clsx(styles.swatch, entry.mark === "line" && styles.swatchLine)}
                style={{ background: entry.color }}
                aria-hidden="true"
              />
              {entry.name}
            </li>
          ))}
        </ul>
      ) : null}
      <div
        className={clsx(styles.plot, barRows === undefined ? styles[size] : styles.barRows)}
        style={barRows === undefined ? undefined : ({ "--chart-rows": barRows } as CSSProperties)}
        role="img"
        aria-label={summary}
      >
        {children}
      </div>
      <div className="visually-hidden">
        <table>
          <caption>{table.caption}</caption>
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={String(row[0])}>
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={index}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
