// The wordmark: the cue-dial lamp with a three-quarter sweep, then the name.
import styles from "./Wordmark.module.css";

export function Wordmark() {
  return (
    <span className={styles.wordmark}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.lamp}>
        <circle cx="16" cy="16" r="14" className={styles.disc} />
        <path d="M16 4 A12 12 0 1 1 4 16 L16 16 Z" className={styles.sweep} />
      </svg>
      WaveSlide
    </span>
  );
}
