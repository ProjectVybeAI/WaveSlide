// E7: the rules and the trained model side by side, as confusion matrices with macro-F1 and the
// time each takes per frame. The commonest slip is named in a sentence so the matrix has a reading.
import type { EvaluationReport } from "@/api/types";
import { ConfusionMatrix } from "@/components/charts";
import { Section } from "@/components/ui";
import { confusionSentence, poseAxis } from "./report";
import { Missing, SectionTitle } from "./sectionKit";
import styles from "./sections.module.css";

type Result = NonNullable<NonNullable<EvaluationReport["sections"]["e7_rules_vs_model"]>["rules"]>;

function Panel({ name, result }: { name: string; result: Result }) {
  return (
    <div className={styles.panel}>
      <h3>
        {name}
        <span className={styles.panelNote}>
          macro-F1 {result.macro_f1.toFixed(2)}, {result.ms_per_frame} ms per frame
        </span>
      </h3>
      <ConfusionMatrix
        title={`${name}, ${result.confusion.labels.length} poses`}
        labels={result.confusion.labels}
        matrix={result.confusion.matrix}
        axis={poseAxis}
      />
    </div>
  );
}

export function ModelSection({ data }: { data: EvaluationReport["sections"]["e7_rules_vs_model"] }) {
  const slip = data ? confusionSentence(data.rules.confusion.labels, data.rules.confusion.matrix) : null;
  return (
    <Section
      id="e7"
      className={styles.section}
      title={<SectionTitle id="E7">Rules against the trained model</SectionTitle>}
      description="Frames from held poses. Rows are what the hand did, columns what was recognised; cells are % of the row."
    >
      {data ? (
        <>
          <div className={styles.pair}>
            <Panel name="Rules" result={data.rules} />
            {data.ml ? (
              <Panel name="Trained model" result={data.ml} />
            ) : (
              <div className={styles.panel}>
                <h3>Trained model</h3>
                <Missing title="No trained model in this run">
                  Train one in Dataset once two participants are recorded, then run again to compare it with
                  the rules.
                </Missing>
              </div>
            )}
          </div>
          {slip ? (
            <p className={styles.help}>
              {slip} The dial&rsquo;s hold is what lets a presenter catch it before a jump.
            </p>
          ) : null}
        </>
      ) : (
        <Missing title="No pose frames in this run">
          E7 compares the rules with the model on held poses. Record a gestures session, then run again.
        </Missing>
      )}
    </Section>
  );
}
