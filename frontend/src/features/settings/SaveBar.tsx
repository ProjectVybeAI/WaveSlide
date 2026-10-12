// The sticky save bar: what changed, why Save is off when it is, what went wrong when saving failed,
// and "saved" once it worked. It is the one place a settings change is committed.
import { CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui";
import styles from "./SaveBar.module.css";

type Props = {
  /** "2 unsaved changes" and which ones. Empty when nothing changed. */
  changeCount: number;
  changeSummary: string;
  /** Why Save is off ("Fix the gesture conflict to save."), or null when it can run. */
  blockedReason: string | null;
  saving: boolean;
  /** The engine's answer when the last save failed; the form keeps what was typed. */
  error: string | null;
  /** The last save worked and nothing has changed since. */
  saved: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export function SaveBar({
  changeCount,
  changeSummary,
  blockedReason,
  saving,
  error,
  saved,
  onSave,
  onDiscard,
}: Props) {
  if (changeCount === 0 && !saved) return null;
  return (
    <div className={styles.bar} role="region" aria-label="Unsaved changes">
      <div className={styles.text} aria-live="polite">
        {changeCount === 0 ? (
          <p className={styles.saved}>
            <CircleCheck size={16} aria-hidden="true" />
            Settings saved. The engine is using them now.
          </p>
        ) : (
          <>
            <p>
              <strong>
                {changeCount} unsaved {changeCount === 1 ? "change" : "changes"}:
              </strong>{" "}
              {changeSummary}.{" "}
              {blockedReason ? (
                <span className={styles.reason} id="save-blocked-reason">
                  {blockedReason}
                </span>
              ) : null}
            </p>
            {error ? (
              <p className={styles.error} role="alert">
                <CircleAlert size={16} aria-hidden="true" />
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
      {changeCount > 0 ? (
        <div className={styles.actions}>
          <Button variant="tertiary" onClick={onDiscard} disabled={saving}>
            Discard changes
          </Button>
          <Button
            variant="primary"
            pending={saving}
            pendingLabel="Saving"
            disabled={blockedReason !== null}
            aria-describedby={blockedReason ? "save-blocked-reason" : undefined}
            onClick={onSave}
          >
            Save settings
          </Button>
        </div>
      ) : null}
    </div>
  );
}
