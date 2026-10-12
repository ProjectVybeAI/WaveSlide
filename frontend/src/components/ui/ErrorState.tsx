// ErrorState: what happened in plain words, what to do next, and a retry, shown where the
// failure happened so the rest of the page keeps working. Pass a human message, never a stack.
import { CircleAlert, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import styles from "./ErrorState.module.css";

export type ErrorStateProps = {
  /** What failed: "Leases could not be loaded". */
  title?: ReactNode;
  /** Why, and what the person can do: "The server did not answer. Check your connection and try again." */
  message?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  /** True while the retry runs: the button keeps its place and says "Trying again". */
  retrying?: boolean;
  /** Another way forward, such as a link to the settings page that fixes it. */
  action?: ReactNode;
  headingLevel?: 2 | 3;
};

export function ErrorState({
  title = "This could not be loaded",
  message,
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  action,
  headingLevel = 2,
}: ErrorStateProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={styles.error} role="alert">
      <CircleAlert className={styles.icon} aria-hidden="true" />
      <div className={styles.text}>
        <Heading className={styles.title}>{title}</Heading>
        {message ? <p className={styles.message}>{message}</p> : null}
        {onRetry || action ? (
          <div className={styles.actions}>
            {onRetry ? (
              <Button icon={RotateCw} onClick={onRetry} pending={retrying} pendingLabel="Trying again">
                {retryLabel}
              </Button>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}
