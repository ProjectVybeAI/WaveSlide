// A confusion matrix as a CSS-grid heat map: rows are what the hand did, columns what was recognised,
// cells are the share of the row (0 shows the surface). The grid carries table roles, so a screen
// reader hears rows, headers and "recognised as" counts; "Show counts as a table" swaps it for a
// real <table> with exact counts, for the examiner who wants numbers rather than shades.
import { clsx } from "clsx";
import { Grid3x3, Table2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { GlyphPose } from "@/components/hand/glyph";
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { Button, Table, TBody, Td, Th, THead, Tr, VisuallyHidden } from "@/components/ui";
import { cellText, heatLevel, rowAccuracy, rowTotal, usesDarkInk } from "./heat";
import styles from "./ConfusionMatrix.module.css";

/** How a class is drawn on an axis: a short word, its full name, and optionally its pose glyph. */
export type AxisLabel = { short: string; name: string; pose?: GlyphPose };

export type ConfusionMatrixProps = {
  /** The matrix's name for screen readers and the table caption: "Rules, 10 poses". */
  title: string;
  labels: string[];
  /** Counts: matrix[row][column] is how often the row's class was recognised as the column's. */
  matrix: number[][];
  axis?: (label: string) => AxisLabel;
  /** What a count counts, for cell descriptions: "frames", "jumps". */
  unit?: string;
};

const plainAxis = (label: string): AxisLabel => ({ short: label, name: label });

export function ConfusionMatrix({
  title,
  labels,
  matrix,
  axis = plainAxis,
  unit = "frames",
}: ConfusionMatrixProps) {
  const [asTable, setAsTable] = useState(false);
  const axes = labels.map(axis);
  return (
    <figure className={styles.figure}>
      {asTable ? (
        <CountsTable title={title} axes={axes} matrix={matrix} unit={unit} />
      ) : (
        <HeatGrid title={title} axes={axes} matrix={matrix} unit={unit} />
      )}
      <figcaption className={styles.caption}>
        <span>Rows: what the hand did. Columns: what was recognised. Cells: % of the row.</span>
        <Button
          size="sm"
          variant="tertiary"
          icon={asTable ? Grid3x3 : Table2}
          onClick={() => setAsTable((current) => !current)}
        >
          {asTable ? "Show heat map" : "Show counts as a table"}
        </Button>
      </figcaption>
    </figure>
  );
}

type PartProps = { title: string; axes: AxisLabel[]; matrix: number[][]; unit: string };

function HeatGrid({ title, axes, matrix, unit }: PartProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrolls = useScrolls(scroller);
  const region = scrolls ? { tabIndex: 0, role: "region", "aria-label": `${title}, scrolls sideways` } : {};
  return (
    <div ref={scroller} className={styles.scroller} {...region}>
      <div
        role="table"
        aria-label={title}
        className={styles.grid}
        style={{ "--cm-columns": axes.length } as CSSProperties}
      >
        <div role="row" className={styles.row}>
          <div role="columnheader" className={styles.corner}>
            <VisuallyHidden>Pose shown</VisuallyHidden>
          </div>
          {axes.map((column) => (
            <div key={column.name} role="columnheader" aria-label={column.name} className={styles.columnHead}>
              {column.pose ? <PoseGlyph pose={column.pose} size={20} /> : null}
              <span>{column.short}</span>
            </div>
          ))}
        </div>
        {matrix.map((counts, rowIndex) => {
          const total = rowTotal(counts);
          const shown = axes[rowIndex];
          if (!shown) return null;
          return (
            <div key={shown.name} role="row" className={styles.row}>
              <div role="rowheader" aria-label={shown.name} className={styles.rowHead}>
                <span>{shown.short}</span>
                {shown.pose ? <PoseGlyph pose={shown.pose} size={20} /> : null}
              </div>
              {counts.map((count, columnIndex) => {
                const level = heatLevel(total === 0 ? 0 : count / total);
                const recognised = axes[columnIndex]?.name ?? "";
                return (
                  <div
                    key={recognised}
                    role="cell"
                    className={clsx(styles.cell, rowIndex === columnIndex && styles.diagonal)}
                    data-level={level}
                    data-ink={usesDarkInk(level) ? "dark" : "light"}
                    aria-label={`${shown.name} recognised as ${recognised}: ${count} of ${total} ${unit}`}
                    title={`${shown.name} recognised as ${recognised}: ${count} of ${total} ${unit}`}
                  >
                    {cellText(count, total)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CountsTable({ title, axes, matrix, unit }: PartProps) {
  return (
    <Table caption={title} captionHidden>
      <THead>
        <Tr>
          <Th>Pose shown</Th>
          {axes.map((column) => (
            <Th key={column.name} align="end">
              {column.name}
            </Th>
          ))}
          <Th align="end">Total {unit}</Th>
          <Th align="end">Recognised</Th>
        </Tr>
      </THead>
      <TBody>
        {matrix.map((counts, rowIndex) => (
          <Tr key={axes[rowIndex]?.name ?? rowIndex}>
            <Th scope="row">{axes[rowIndex]?.name}</Th>
            {counts.map((count, columnIndex) => (
              <Td key={axes[columnIndex]?.name ?? columnIndex} align="end">
                {count}
              </Td>
            ))}
            <Td align="end">{rowTotal(counts)}</Td>
            <Td align="end">{Math.round(rowAccuracy(counts, rowIndex) * 100)}%</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

/** True while the element is wider than its box; then it needs to be a keyboard stop. */
function useScrolls(ref: RefObject<HTMLElement | null>): boolean {
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setScrolls(element.scrollWidth > element.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return scrolls;
}
