// A histogram with marker lines (the median and the 95th percentile). Drawn as plain SVG at the
// box's real pixel size, so the markers sit at their exact value on the axis, which a category
// chart cannot do, and the text is never scaled. Bars are 3 px rounded at the top with a 2 px gap.
import { useEffect, useRef, useState } from "react";
import { ChartFrame } from "./ChartFrame";
import { figure } from "./format";
import styles from "./charts.module.css";

export type HistogramBin = { start: number; end: number; count: number };
export type Marker = { value: number; label: string };

type Props = {
  bins: HistogramBin[];
  markers: Marker[];
  /** Under the x axis: "ms, frame capture to key sent". */
  unit: string;
  /** What a bar counts: "commands". */
  countName: string;
  summary: string;
  caption: string;
};

const PAD = { top: 24, right: 12, bottom: 44, left: 44 };
const GAP = 1; // half the 2 px gap between neighbouring bars
const RADIUS = 3;
const MIN_TICK_SPACING = 56;

export function Histogram({ bins, markers, unit, countName, summary, caption }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const first = bins[0];
  const last = bins[bins.length - 1];
  const edges = first && last ? [...bins.map((bin) => bin.start), last.end] : [];
  const xMin = first?.start ?? 0;
  const xMax = last?.end ?? 1;
  const top = niceCeil(Math.max(...bins.map((bin) => bin.count), 1));
  const innerW = Math.max(size.width - PAD.left - PAD.right, 1);
  const innerH = Math.max(size.height - PAD.top - PAD.bottom, 1);
  const x = (value: number) => PAD.left + ((value - xMin) / (xMax - xMin)) * innerW;
  const y = (count: number) => PAD.top + innerH - (count / top) * innerH;
  const every = Math.max(1, Math.ceil(edges.length / Math.max(1, Math.floor(innerW / MIN_TICK_SPACING))));
  const yTicks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const hovered = hover === null ? undefined : bins[hover];

  return (
    <ChartFrame
      summary={summary}
      table={{
        caption,
        columns: [`Range (${unit})`, countName],
        rows: bins.map((bin) => [`${figure(bin.start)} to ${figure(bin.end)}`, bin.count]),
      }}
    >
      <div ref={box} className={styles.histogram}>
        {size.width > 0 ? (
          <svg width={size.width} height={size.height} aria-hidden="true">
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  className={tick === 0 ? styles.baseline : styles.grid}
                  x1={PAD.left}
                  x2={size.width - PAD.right}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text className={styles.tick} x={PAD.left - 8} y={y(tick)} dy="0.35em" textAnchor="end">
                  {figure(tick)}
                </text>
              </g>
            ))}
            {bins.map((bin, index) => {
              const left = x(bin.start) + GAP;
              const right = x(bin.end) - GAP;
              const height = y(0) - y(bin.count);
              const r = Math.min(RADIUS, height, (right - left) / 2);
              return (
                <path
                  key={bin.start}
                  className={styles.bar}
                  data-hover={hover === index || undefined}
                  d={`M${left} ${y(0)}V${y(bin.count) + r}Q${left} ${y(bin.count)} ${left + r} ${y(bin.count)}H${right - r}Q${right} ${y(bin.count)} ${right} ${y(bin.count) + r}V${y(0)}Z`}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
            {edges.map((edge, index) =>
              index % every === 0 ? (
                <text key={edge} className={styles.tick} x={x(edge)} y={y(0) + 20} textAnchor="middle">
                  {figure(edge)}
                </text>
              ) : null,
            )}
            <text className={styles.tickNote} x={size.width - PAD.right} y={size.height - 6} textAnchor="end">
              {unit}
            </text>
            {markers.map((marker, index) => {
              const at = x(Math.min(Math.max(marker.value, xMin), xMax));
              // The first label sits left of its line, the second right of its own, unless the edge is near.
              const flip = index === 0 || at > size.width - 96;
              return (
                <g key={marker.label}>
                  <line className={styles.marker} x1={at} x2={at} y1={PAD.top - 8} y2={y(0)} />
                  <text
                    className={styles.value}
                    x={at + (flip ? -6 : 6)}
                    y={PAD.top - 6}
                    textAnchor={flip ? "end" : "start"}
                  >
                    {marker.label}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : null}
        {hovered ? (
          <div
            className={styles.tooltip}
            style={{ left: x((hovered.start + hovered.end) / 2), top: y(hovered.count) }}
          >
            <p className={styles.tooltipTitle}>
              {figure(hovered.start)} to {figure(hovered.end)} {unit.split(",")[0]}
            </p>
            <ul className={styles.tooltipRows}>
              <li>
                <span>{countName}</span>
                <strong>{figure(hovered.count)}</strong>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </ChartFrame>
  );
}

/** Rounds up to 1, 2 or 5 times a power of ten, so the y axis ends on a clean number. */
function niceCeil(value: number): number {
  const power = 10 ** Math.floor(Math.log10(value));
  const lead = value / power;
  const step = lead <= 1 ? 1 : lead <= 2 ? 2 : lead <= 5 ? 5 : 10;
  return step * power;
}
