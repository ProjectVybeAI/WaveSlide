// E1 (per gesture, per participant) and E2 (finger-count jumps).
import type { EvaluationReport } from "@/api/types";
import { ConfusionMatrix, percentExact } from "@/components/charts";
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { actionName, gestureName, isPose, jumpAxis } from "./report";
import { Missing, SectionTitle } from "./sectionKit";
import styles from "./sections.module.css";

type Sections = EvaluationReport["sections"];

export function GestureSection({ data }: { data: Sections["e1_gestures"] }) {
  const participants = data
    ? [...new Set(data.rows.flatMap((row) => Object.keys(row.per_participant)))].sort()
    : [];
  return (
    <Section
      id="e1"
      className={styles.section}
      title={<SectionTitle id="E1">Per gesture, per participant</SectionTitle>}
      description="A gesture counts as correct when exactly its command fires between its start and 0.5 s after it ends."
    >
      {data ? (
        <Table caption="Correct commands per gesture and participant" captionHidden>
          <THead>
            <Tr>
              <Th>Gesture</Th>
              <Th>Action</Th>
              {participants.map((name) => (
                <Th key={name} align="end">
                  {name}
                </Th>
              ))}
              <Th align="end">All</Th>
              <Th align="end">Accuracy</Th>
            </Tr>
          </THead>
          <TBody>
            {data.rows.map((row) => (
              <Tr key={`${row.gesture}-${row.action}`}>
                <Td>
                  <span className={styles.gesture}>
                    {isPose(row.gesture) ? <PoseGlyph pose={row.gesture} size={24} /> : null}
                    {gestureName(row.gesture)}
                  </span>
                </Td>
                <Td>{actionName(row.action)}</Td>
                {participants.map((name) => {
                  const tally = row.per_participant[name];
                  return (
                    <Td key={name} align="end">
                      {tally ? `${tally.correct}/${tally.total}` : "–"}
                    </Td>
                  );
                })}
                <Td align="end">
                  {row.correct}/{row.total}
                </Td>
                <Td align="end" className={styles.strong}>
                  {percentExact(row.accuracy)}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : (
        <Missing title="No gestures session in this run">
          E1 scores each gesture against the commands it fired. Record a gestures session, then run again.
        </Missing>
      )}
    </Section>
  );
}

export function JumpSection({ data }: { data: Sections["e2_finger_count"] }) {
  return (
    <Section
      id="e2"
      className={styles.section}
      title={<SectionTitle id="E2">Finger-count jumps</SectionTitle>}
      description={
        data
          ? `${percentExact(data.accuracy)} of jumps went to the slide shown. Rows are the fingers held up, columns the slide jumped to.`
          : "Rows are the fingers held up, columns the slide jumped to."
      }
    >
      {data ? (
        <div className={styles.pair}>
          <div className={styles.panel}>
            <h3>
              One hand<span className={styles.panelNote}>1 to 5 fingers</span>
            </h3>
            <ConfusionMatrix
              title="Jumps with one hand"
              labels={data.one_hand.labels}
              matrix={data.one_hand.matrix}
              axis={jumpAxis}
              unit="jumps"
            />
          </div>
          <div className={styles.panel}>
            <h3>
              Two hands<span className={styles.panelNote}>6 to 10 fingers</span>
            </h3>
            {data.two_hand ? (
              <ConfusionMatrix
                title="Jumps with two hands"
                labels={data.two_hand.labels}
                matrix={data.two_hand.matrix}
                axis={jumpAxis}
                unit="jumps"
              />
            ) : (
              <Missing title="No two-hand session in this run">
                Record a two-hand session to test slides 6 to 10.
              </Missing>
            )}
          </div>
        </div>
      ) : (
        <Missing title="No finger-count jumps in this run">
          Jumps are scored from a gestures session. Record one, then run again.
        </Missing>
      )}
    </Section>
  );
}
