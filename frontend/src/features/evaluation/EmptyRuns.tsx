// No evaluation has been run yet: what a run does, what a real one needs (checked against the
// recorded sessions), and the two ways forward: record people, or try the harness on synthetic data.
import { Database, Play } from "lucide-react";
import { Link } from "react-router";
import type { SessionSummary } from "@/api/types";
import { Button, StatusPill, buttonClassName, type StatusTone } from "@/components/ui";
import { evaluationNeeds, type Need } from "./needs";
import styles from "./EmptyRuns.module.css";

type Props = {
  /** Null while the sessions are still loading or could not be read. */
  sessions: SessionSummary[] | null;
  hasModel: boolean;
  onTrySynthetic: () => void;
  starting: boolean;
};

function pill(need: Need): { tone: StatusTone; text: string } {
  const text = need.want === 1 ? (need.have >= 1 ? "Trained" : "Not yet") : `${need.have} of ${need.want}`;
  if (need.have >= need.want) return { tone: "success", text };
  return { tone: need.required ? "warning" : "neutral", text };
}

export function EmptyRuns({ sessions, hasModel, onTrySynthetic, starting }: Props) {
  const needs = sessions ? evaluationNeeds(sessions, hasModel) : null;
  return (
    <section className={styles.empty} aria-labelledby="no-runs">
      <div className={styles.lead}>
        <h2 id="no-runs">No evaluation runs yet</h2>
        <p>
          A run replays recorded sessions through the real pipeline and measures accuracy per gesture, false
          triggers while talking, response time, distance, lighting, and the rules against the trained model.
          It takes about a minute and changes nothing in your settings.
        </p>
        <div className={styles.actions}>
          <Link
            to="/dataset"
            className={buttonClassName({ variant: "primary", className: styles.linkButton })}
          >
            <Database size={16} aria-hidden="true" />
            Record participants
          </Link>
          <Button icon={Play} pending={starting} pendingLabel="Starting" onClick={onTrySynthetic}>
            Try it on synthetic sessions
          </Button>
        </div>
      </div>
      <div>
        <h3 className={styles.needsTitle}>What a real run needs</h3>
        {needs ? (
          <ul className={styles.needs}>
            {needs.map((need) => {
              const { tone, text } = pill(need);
              return (
                <li key={need.label}>
                  <span>{need.label}</span>
                  <StatusPill tone={tone}>{text}</StatusPill>
                  <small>{need.note}</small>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.unknown}>
            WaveSlide could not read the recorded sessions, so it cannot say what is missing. Open Dataset to
            see them.
          </p>
        )}
      </div>
    </section>
  );
}
