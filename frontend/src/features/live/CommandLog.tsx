// "Sent this session": the command log as a cue list. Newest first, numbered, with the pose glyph,
// the keys as caps, capture-to-key latency, and the result in words (blocked commands stay, with why).
import { clsx } from "clsx";
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { blockedReasonLabel, commandLabel } from "@/components/hand/cue";
import { GESTURE_LABEL } from "@/components/hand/glyph";
import { KeyCaps } from "@/components/hand/KeyCaps";
import { Section, StatusPill, Table, TableEmpty, TBody, Td, Th, THead, Tr } from "@/components/ui";
import type { CommandLogEntry } from "@/api/types";
import { formatClock, formatMs } from "@/lib/format";
import { PHONE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import styles from "./CommandLog.module.css";

function gestureText(entry: CommandLogEntry): string {
  const label = GESTURE_LABEL[entry.gesture];
  return entry.gesture.startsWith("SWIPE") ? label : `${label}, held`;
}

type Props = { entries: CommandLogEntry[]; profileId: string };

type Outcome = { tone: "success" | "info" | "warning"; text: string };

/** What happened to a command, in words; the table shows it as a pill, the phone list as a dot. */
function outcome(entry: CommandLogEntry, profileId: string): Outcome {
  if (entry.blocked_reason) {
    return { tone: "warning", text: `Not sent: ${blockedReasonLabel(entry.blocked_reason)}` };
  }
  if (entry.action === "toggle_active") return { tone: "info", text: "Switched" };
  // Only the practice profile sends to the deck; any other dry run (replay) only records the key.
  if (entry.dry_run) {
    return {
      tone: "info",
      text: profileId === "practice" ? "Sent to practice deck" : "Recorded, not pressed",
    };
  }
  return { tone: "success", text: "Sent" };
}

/** Under 560 px: two ruled lines per command (a third for the reason a key was held back). */
function CompactList({ entries, profileId }: Props) {
  return (
    <ol className={styles.list} aria-label="Commands sent this session">
      {entries.map((entry) => {
        const result = outcome(entry, profileId);
        return (
          <li key={entry.id} className={clsx(styles.item, entry.blocked_reason && styles.blocked)}>
            <p className={styles.first}>
              <span className={styles.number}>#{entry.id}</span>
              <span className={styles.time}>{formatClock(entry.t)}</span>
              <span className={styles.gesture}>
                <PoseGlyph pose={entry.gesture} size={24} />
                {gestureText(entry)}
              </span>
            </p>
            <p className={styles.second}>
              <span className={styles.actionKeys}>
                <span>{commandLabel(entry)}</span>
                <KeyCaps keys={entry.keys} slide={entry.slide} />
              </span>
              <span className={styles.figures}>
                {formatMs(entry.pipeline_ms)}
                <span className={styles.dot} data-tone={result.tone} role="img" aria-label={result.text} />
              </span>
            </p>
            {entry.blocked_reason ? <p className={styles.reason}>{result.text}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function CommandLog({ entries, profileId }: Props) {
  const phone = useMediaQuery(PHONE_QUERY);
  const blocked = entries.filter((entry) => entry.blocked_reason).length;
  const summary =
    entries.length === 0
      ? "Newest first."
      : `${entries.length} ${entries.length === 1 ? "command" : "commands"}${blocked ? `, ${blocked} not sent` : ""}. Newest first.`;
  return (
    <Section title="Sent this session" description={summary}>
      {phone && entries.length > 0 ? (
        <CompactList entries={entries} profileId={profileId} />
      ) : (
        <Table caption="Commands sent this session" captionHidden>
          <THead>
            <Tr>
              <Th align="end">#</Th>
              <Th>Time</Th>
              <Th>Gesture</Th>
              <Th>Action</Th>
              <Th>Keys</Th>
              <Th align="end">Capture to key</Th>
              <Th>Result</Th>
            </Tr>
          </THead>
          <TBody>
            {entries.length === 0 ? (
              <TableEmpty colSpan={7}>
                <p className={styles.empty}>
                  Nothing sent yet. Show a thumbs up for a second to go live, then swipe or hold up fingers.
                  Every key WaveSlide sends appears here, and so does every one it held back.
                </p>
              </TableEmpty>
            ) : (
              entries.map((entry) => (
                <Tr key={entry.id} className={entry.blocked_reason ? styles.blocked : undefined}>
                  <Td align="end" className={styles.muted}>
                    {entry.id}
                  </Td>
                  <Td>{formatClock(entry.t)}</Td>
                  <Td>
                    <span className={styles.gesture}>
                      <PoseGlyph pose={entry.gesture} size={24} />
                      {gestureText(entry)}
                    </span>
                  </Td>
                  <Td>{commandLabel(entry)}</Td>
                  <Td>
                    <KeyCaps keys={entry.keys} slide={entry.slide} />
                  </Td>
                  <Td align="end">{formatMs(entry.pipeline_ms)}</Td>
                  <Td>
                    <StatusPill tone={outcome(entry, profileId).tone}>
                      {outcome(entry, profileId).text}
                    </StatusPill>
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      )}
    </Section>
  );
}
