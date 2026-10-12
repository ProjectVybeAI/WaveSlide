// A running background job: what it is doing and how far it has got. A native <progress>, so
// assistive technology reads the percentage, with the engine's message beside it in words.
import type { Job } from "@/api/types";
import styles from "./JobProgress.module.css";

const TITLES: Record<Job["kind"], string> = {
  train: "Training the model",
  evaluate: "Running the evaluation",
};

export function JobProgress({ job }: { job: Job }) {
  const percent = Math.round(job.progress * 100);
  return (
    <div className={styles.job} role="status">
      <div className={styles.text}>
        <p className={styles.title}>{TITLES[job.kind]}</p>
        <p className={styles.message}>
          {job.message || (job.status === "queued" ? "Waiting to start" : "Working")}
        </p>
      </div>
      <progress className={styles.bar} value={job.progress} max={1} aria-label={TITLES[job.kind]}>
        {percent}%
      </progress>
      <p className={styles.percent}>{percent}%</p>
    </div>
  );
}
