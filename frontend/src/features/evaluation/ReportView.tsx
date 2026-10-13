// One evaluation report: synthetic banner, section links, the headline strip, then the sections in
// report order (E1 to E8, then the ablation). A section the run could not measure says so in place.
import type { EvaluationReport } from "@/api/types";
import { FigureStrip } from "@/components/charts";
import { Callout } from "@/components/ui";
import { DistanceSection, LightingSection, ResponseSection } from "./ConditionSections";
import { GestureSection, JumpSection } from "./GestureSections";
import { ModelSection } from "./ModelSection";
import { RatingsSection } from "./RatingsSection";
import { headlineFigures } from "./report";
import { OpenDatasetLink } from "./sectionKit";
import { SectionNav } from "./SectionNav";
import { AblationSection, FalseTriggerSection } from "./TriggerSections";
import styles from "./ReportView.module.css";
import sections from "./sections.module.css";

export function ReportView({ report }: { report: EvaluationReport }) {
  const s = report.sections;
  return (
    <div className={styles.report}>
      {report.synthetic ? (
        <Callout tone="warning" title="Synthetic sessions" action={<OpenDatasetLink />}>
          These numbers come from generated hands ({report.n_sessions} sessions, made-up participants{" "}
          {report.participants.join(", ")}). They show that the harness works, not how WaveSlide performs.
          Record real participants in Dataset, then run again.
        </Callout>
      ) : (
        <p className={styles.source}>
          {report.n_sessions} recorded sessions from {report.participants.length}{" "}
          {report.participants.length === 1 ? "participant" : "participants"}:{" "}
          {report.participants.join(", ")}.
        </p>
      )}
      <SectionNav />
      <FigureStrip figures={headlineFigures(s)} label="Headline results" />
      <GestureSection data={s.e1_gestures} />
      <JumpSection data={s.e2_finger_count} />
      <div className={sections.pair}>
        <FalseTriggerSection data={s.e3_false_triggers} />
        <ResponseSection data={s.e4_response_time} />
      </div>
      <div className={sections.pair}>
        <DistanceSection data={s.e5_distance} />
        <LightingSection data={s.e6_lighting} />
      </div>
      <ModelSection data={s.e7_rules_vs_model} />
      <div className={sections.pair}>
        <RatingsSection data={s.e8_ratings} synthetic={report.synthetic} />
        <AblationSection data={s.ablation} />
      </div>
    </div>
  );
}
