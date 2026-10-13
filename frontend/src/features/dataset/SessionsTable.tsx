// The recorded and synthetic sessions as a ruled table, newest first. Long participant names are
// cut with a tooltip, and a few hundred sessions are shown fifty at a time.
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { SessionSummary } from "@/api/types";
import { Button, IconButton, StatusPill, Table, TBody, Td, Th, THead, Tooltip, Tr } from "@/components/ui";
import {
  formatCount,
  formatDistance,
  formatLength,
  formatLuminance,
  formatWhen,
  KIND_LABEL,
  LIGHTING_LABEL,
} from "./labels";
import { PHONE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import styles from "./SessionsTable.module.css";

const PAGE = 50;

type Props = { sessions: SessionSummary[]; onDelete: (session: SessionSummary) => void };

/** "Gestures · 1 m · Dim · 2:17 · 4,122 frames": the table's columns as one muted line. */
function summaryLine(session: SessionSummary): string {
  const parts = [
    KIND_LABEL[session.kind],
    session.distance_m === null ? null : formatDistance(session.distance_m),
    session.lighting ? LIGHTING_LABEL[session.lighting] : null,
    formatLength(session.duration_s),
    `${formatCount(session.n_frames)} frames`,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Under 560 px the ten columns do not fit: each session is two lines and a delete button. */
function SessionRows({ sessions, onDelete }: Props) {
  return (
    <ul className={styles.rows} aria-label="Recorded and synthetic sessions">
      {sessions.map((session) => (
        <li key={session.id} className={styles.row}>
          <div className={styles.text}>
            <p className={styles.name}>
              <span className={styles.nameText} title={session.participant}>
                {session.participant}
              </span>
              <span
                className={styles.source}
                data-source={session.source}
                role="img"
                aria-label={session.source === "synthetic" ? "Synthetic" : "Recorded"}
                title={session.source === "synthetic" ? "Synthetic" : "Recorded"}
              />
            </p>
            <p className={styles.line}>{summaryLine(session)}</p>
          </div>
          <IconButton
            icon={Trash2}
            size="sm"
            label={`Delete session ${session.id}`}
            onClick={() => onDelete(session)}
          />
        </li>
      ))}
    </ul>
  );
}

export function SessionsTable({ sessions, onDelete }: Props) {
  const [shown, setShown] = useState(PAGE);
  const phone = useMediaQuery(PHONE_QUERY);
  const newestFirst = [...sessions].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className={styles.wrap}>
      {phone ? (
        <SessionRows sessions={newestFirst.slice(0, shown)} onDelete={onDelete} />
      ) : (
        <Table caption="Recorded and synthetic sessions" captionHidden>
          <THead>
            <Tr>
              <Th>Participant</Th>
              <Th>Protocol</Th>
              <Th align="end">Distance</Th>
              <Th>Lighting</Th>
              <Th align="end">Luminance</Th>
              <Th align="end">Frames</Th>
              <Th align="end">Length</Th>
              <Th>Recorded</Th>
              <Th>Source</Th>
              <Th align="end">
                <span className="visually-hidden">Actions</span>
              </Th>
            </Tr>
          </THead>
          <TBody>
            {newestFirst.slice(0, shown).map((session) => (
              <Tr key={session.id}>
                <Td truncate title={session.participant} className={styles.participant}>
                  {session.participant}
                </Td>
                <Td>{KIND_LABEL[session.kind]}</Td>
                <Td align="end">{formatDistance(session.distance_m)}</Td>
                <Td>{session.lighting ? LIGHTING_LABEL[session.lighting] : "–"}</Td>
                <Td align="end">{formatLuminance(session.luminance_mean)}</Td>
                <Td align="end">{formatCount(session.n_frames)}</Td>
                <Td align="end">{formatLength(session.duration_s)}</Td>
                <Td className={styles.when}>{formatWhen(session.created_at)}</Td>
                <Td>
                  {session.source === "synthetic" ? (
                    <StatusPill tone="warning">Synthetic</StatusPill>
                  ) : (
                    <StatusPill tone="info">Recorded</StatusPill>
                  )}
                </Td>
                <Td align="end">
                  <Tooltip content="Delete session">
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      label={`Delete session ${session.id}`}
                      onClick={() => onDelete(session)}
                    />
                  </Tooltip>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
      {newestFirst.length > shown ? (
        <div className={styles.more}>
          <p>
            Showing {formatCount(shown)} of {formatCount(newestFirst.length)} sessions.
          </p>
          <Button size="sm" onClick={() => setShown((count) => count + PAGE)}>
            Show {Math.min(PAGE, newestFirst.length - shown)} more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
