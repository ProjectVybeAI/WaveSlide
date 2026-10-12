// E3 (false triggers while talking) and the ablation (what each reliability control prevents).
import type { EvaluationReport } from "@/api/types";
import { FigureStrip, HorizontalBars, figure } from "@/components/charts";
import { Section } from "@/components/ui";
import { CONTROL_LABEL } from "./report";
import { Missing, SectionTitle } from "./sectionKit";
import styles from "./sections.module.css";

type Sections = EvaluationReport["sections"];
const SERIES_COLOUR = "var(--color-chart-1)";

export function FalseTriggerSection({ data }: { data: Sections["e3_false_triggers"] }) {
  const people = data ? Object.entries(data.per_participant).sort(([a], [b]) => a.localeCompare(b)) : [];
  return (
    <Section
      id="e3"
      className={styles.section}
      title={<SectionTitle id="E3">False triggers while talking</SectionTitle>}
      description={
        data
          ? `${figure(data.minutes)} minutes of talking with the hands moving. A false trigger is a command that fired when none was meant.`
          : undefined
      }
    >
      {data ? (
        <>
          <FigureStrip
            label="False triggers per minute"
            figures={[
              { value: figure(data.active_per_min), unit: "/min", label: "While live" },
              { value: figure(data.paused_per_min), unit: "/min", label: "While paused" },
            ]}
          />
          {people.length > 0 ? (
            <HorizontalBars
              rows={people.map(([participant, perMinute]) => ({ label: participant, value: perMinute }))}
              color={SERIES_COLOUR}
              valueName="False triggers"
              unit="false triggers per minute, while live"
              labelColumn={64}
              summary={`False triggers per minute while live, by participant: ${people.map(([p, v]) => `${p} ${figure(v)}`).join(", ")}.`}
              caption="False triggers per minute by participant"
            />
          ) : null}
        </>
      ) : (
        <Missing title="No talking session in this run">
          E3 needs three minutes of talking per participant. Record a talking session, then run again.
        </Missing>
      )}
    </Section>
  );
}

export function AblationSection({ data }: { data: Sections["ablation"] }) {
  const rows = (data?.rows ?? []).map((row) => ({
    label: CONTROL_LABEL[row.control],
    value: row.false_triggers_per_min,
  }));
  const baseline = rows.find((row) => row.label === CONTROL_LABEL.all_on);
  const worst = rows.reduce<(typeof rows)[number] | null>(
    (top, row) => (top === null || row.value > top.value ? row : top),
    null,
  );
  return (
    <Section
      id="ablation"
      className={styles.section}
      title={<SectionTitle>Ablation: what each control prevents</SectionTitle>}
      description={
        data
          ? `False triggers per minute in ${figure(data.minutes)} minutes of talking with gestures live, turning off one control at a time.`
          : undefined
      }
    >
      {data && rows.length > 0 ? (
        <>
          <HorizontalBars
            rows={rows}
            color={SERIES_COLOUR}
            valueName="False triggers"
            unit="false triggers per minute"
            summary={`False triggers per minute: ${rows.map((r) => `${r.label} ${figure(r.value)}`).join(", ")}.`}
            caption="False triggers per minute with one control off"
          />
          {baseline && worst && worst !== baseline ? (
            <p className={styles.help}>
              With {worst.label.toLowerCase()}, false triggers rise from {figure(baseline.value)} to{" "}
              {figure(worst.value)} per minute.
            </p>
          ) : null}
        </>
      ) : (
        <Missing title="No ablation in this run">
          The ablation replays a talking session with each control off. Record one, then run again.
        </Missing>
      )}
    </Section>
  );
}
