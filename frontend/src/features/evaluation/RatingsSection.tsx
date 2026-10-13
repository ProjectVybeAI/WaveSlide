// E8: what the study participants said, 1 to 5 for ease and for reliability, with their comments.
import type { EvaluationReport } from "@/api/types";
import { figure } from "@/components/charts";
import { Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { SectionTitle } from "./sectionKit";
import { Missing } from "./sectionKit";
import styles from "./sections.module.css";

type Props = {
  data: EvaluationReport["sections"]["e8_ratings"];
  /** A synthetic run has no participants, so it cannot have ratings. */
  synthetic: boolean;
};

export function RatingsSection({ data, synthetic }: Props) {
  const count = data?.rows.length ?? 0;
  return (
    <Section
      id="e8"
      className={styles.section}
      title={<SectionTitle id="E8">User ratings</SectionTitle>}
      description={
        data && count > 0
          ? `Mean ease ${figure(data.ease_mean)} of 5 and reliability ${figure(data.reliability_mean)} of 5, from ${count} ${count === 1 ? "participant" : "participants"}.`
          : undefined
      }
    >
      {data && count > 0 ? (
        <Table caption="Ratings and comments by participant" captionHidden>
          <THead>
            <Tr>
              <Th>Participant</Th>
              <Th align="end">Ease</Th>
              <Th align="end">Reliability</Th>
              <Th>Comment</Th>
            </Tr>
          </THead>
          <TBody>
            {data.rows.map((row) => (
              <Tr key={row.participant}>
                <Td className={styles.strong}>{row.participant}</Td>
                <Td align="end">{row.ease} of 5</Td>
                <Td align="end">{row.reliability} of 5</Td>
                <Td className={row.comment ? styles.comment : styles.empty}>{row.comment || "No comment"}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      ) : synthetic ? (
        <Missing title="Synthetic run: no ratings collected">
          The participants in a synthetic run are generated, so nobody rated anything. Ratings appear when a
          run uses recorded sessions and eval/feedback.csv.
        </Missing>
      ) : (
        <Missing title="No ratings in this run">
          Ratings come from eval/feedback.csv, one row per study participant. Add the forms you collected,
          then run again.
        </Missing>
      )}
    </Section>
  );
}
