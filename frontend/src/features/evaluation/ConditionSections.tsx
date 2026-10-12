// E4 (capture to key latency), E5 (accuracy by distance) and E6 (accuracy by lighting).
import type { EvaluationReport } from "@/api/types";
import {
  Histogram,
  PercentBars,
  PercentLines,
  figure,
  percent,
  type ConditionRow,
  type Series,
} from "@/components/charts";
import { Section } from "@/components/ui";
import { Missing, SectionTitle } from "./sectionKit";
import styles from "./sections.module.css";

type Sections = EvaluationReport["sections"];
type Row = NonNullable<Sections["e5_distance"]>["rows"][number];

const RULES: Series = { key: "rules", name: "Rules", color: "var(--color-chart-1)" };
const MODEL: Series = { key: "ml", name: "Trained model", color: "var(--color-chart-2)" };

/** Rules always; the trained model only when this run measured it. */
const seriesFor = (rows: Row[]): Series[] =>
  rows.some((row) => row.ml_accuracy !== null) ? [RULES, MODEL] : [RULES];

const toRow = (row: Row, label: string, note: string): ConditionRow => ({
  label,
  note,
  values: { rules: row.rules_accuracy, ml: row.ml_accuracy ?? null },
});

/** "Rules 97, 96 and 76 percent for 0.5 m, 1 m and 2 m." for the chart's accessible name. */
function describe(what: string, rows: ConditionRow[], series: Series[]): string {
  const parts = series.map(
    (s) => `${s.name} ${rows.map((row) => percent(row.values[s.key] ?? 0)).join(", ")}`,
  );
  return `${what}: ${parts.join("; ")} for ${rows.map((row) => row.label).join(", ")}.`;
}

export function ResponseSection({ data }: { data: Sections["e4_response_time"] }) {
  const lines = data
    ? [
        "Held poses add their deliberate 0.8 to 1.0 s hold on top.",
        data.gesture_end_to_command_p50_ms !== null && data.gesture_end_to_command_p50_ms !== undefined
          ? `From the end of a gesture to its command: median ${figure(data.gesture_end_to_command_p50_ms)} ms.`
          : null,
        data.key_to_render_p50_ms !== null && data.key_to_render_p50_ms !== undefined
          ? `Key to practice-deck render adds a median ${figure(data.key_to_render_p50_ms)} ms.`
          : null,
      ].filter((line) => line !== null)
    : [];
  return (
    <Section
      id="e4"
      className={styles.section}
      title={<SectionTitle id="E4">Capture to key</SectionTitle>}
      description={data ? `${figure(data.n_commands)} commands. ${lines.join(" ")}` : undefined}
    >
      {data && data.histogram.length > 0 ? (
        <Histogram
          bins={data.histogram.map((bin) => ({ start: bin.start_ms, end: bin.end_ms, count: bin.count }))}
          markers={[
            { value: data.pipeline_p50_ms, label: `p50 ${figure(data.pipeline_p50_ms)} ms` },
            { value: data.pipeline_p95_ms, label: `p95 ${figure(data.pipeline_p95_ms)} ms` },
          ]}
          unit="ms, frame capture to key sent"
          countName="Commands"
          summary={`Capture to key time for ${figure(data.n_commands)} commands: median ${figure(data.pipeline_p50_ms)} ms, 95th percentile ${figure(data.pipeline_p95_ms)} ms.`}
          caption="Commands by capture-to-key time"
        />
      ) : (
        <Missing title="No commands timed in this run">
          E4 times every command the replay fires. Record a gestures session, then run again.
        </Missing>
      )}
    </Section>
  );
}

export function DistanceSection({ data }: { data: Sections["e5_distance"] }) {
  const series = data ? seriesFor(data.rows) : [];
  const rows = (data?.rows ?? []).map((row) =>
    toRow(row, row.condition, `found ${percent(row.detection_rate)}`),
  );
  return (
    <Section
      id="e5"
      className={styles.section}
      title={<SectionTitle id="E5">Accuracy by distance</SectionTitle>}
      description="Held poses, by distance from the camera. Under each distance: how often a hand was found. The line is the 90% bar."
    >
      {data && rows.length > 0 ? (
        <PercentLines
          rows={rows}
          series={series}
          threshold={{ value: 0.9, label: "90% bar" }}
          summary={describe("Accuracy by distance", rows, series)}
          caption="Accuracy and hand detection by distance"
          conditionName="Distance"
        />
      ) : (
        <Missing title="No distance recordings in this run">
          One participant recorded at 0.5, 1, 1.5 and 2 m is enough. Record them, then run again.
        </Missing>
      )}
    </Section>
  );
}

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export function LightingSection({ data }: { data: Sections["e6_lighting"] }) {
  const series = data ? seriesFor(data.rows) : [];
  const rows = (data?.rows ?? []).map((row) =>
    toRow(
      row,
      capitalise(row.condition),
      row.luminance_mean === null || row.luminance_mean === undefined
        ? `found ${percent(row.detection_rate)}`
        : `luminance ${figure(row.luminance_mean)}`,
    ),
  );
  return (
    <Section
      id="e6"
      className={styles.section}
      title={<SectionTitle id="E6">Accuracy by lighting</SectionTitle>}
      description="Held poses, by room light. Luminance is the mean frame brightness the camera saw, 0 to 255."
    >
      {data && rows.length > 0 ? (
        <PercentBars
          rows={rows}
          series={series}
          summary={describe("Accuracy by lighting", rows, series)}
          caption="Accuracy by lighting"
          conditionName="Lighting"
        />
      ) : (
        <Missing title="No lighting recordings in this run">
          Record one participant in bright, normal and dim light, then run again.
        </Missing>
      )}
    </Section>
  );
}
