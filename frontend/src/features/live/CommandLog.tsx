// "Sent this session": the command log as a cue list. Newest first, numbered, with the pose glyph,
// the keys as caps, capture-to-key latency, and the result in words (blocked commands stay, with why).
import { PoseGlyph } from "@/components/hand/PoseGlyph";
import { blockedReasonLabel, commandLabel } from "@/components/hand/cue";
import { GESTURE_LABEL } from "@/components/hand/glyph";
import { KeyCaps } from "@/components/hand/KeyCaps";
import { Section, StatusPill, Table, TableEmpty, TBody, Td, Th, THead, Tr } from "@/components/ui";
import type { CommandLogEntry } from "@/api/types";
import { formatClock, formatMs } from "@/lib/format";
import styles from "./CommandLog.module.css";

function gestureText(entry: CommandLogEntry): string {
  const label = GESTURE_LABEL[entry.gesture];
  return entry.gesture.startsWith("SWIPE") ? label : `${label}, held`;
}

function Result({ entry }: { entry: CommandLogEntry }) {
  if (entry.blocked_reason) {
    return <StatusPill tone="warning">Not sent: {blockedReasonLabel(entry.blocked_reason)}</StatusPill>;
  }
  if (entry.action === "toggle_active") return <StatusPill tone="info">Switched</StatusPill>;
  if (entry.dry_run) return <StatusPill tone="info">Sent to practice deck</StatusPill>;
  return <StatusPill tone="success">Sent</StatusPill>;
}

export function CommandLog({ entries }: { entries: CommandLogEntry[] }) {
  const blocked = entries.filter((entry) => entry.blocked_reason).length;
  const summary =
    entries.length === 0
      ? "Newest first."
      : `${entries.length} ${entries.length === 1 ? "command" : "commands"}${blocked ? `, ${blocked} not sent` : ""}. Newest first.`;
  return (
    <Section title="Sent this session" description={summary}>
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
              <Tr key={entry.id}>
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
                  <Result entry={entry} />
                </Td>
              </Tr>
            ))
          )}
        </TBody>
      </Table>
    </Section>
  );
}
