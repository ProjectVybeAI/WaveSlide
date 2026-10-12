// Small pieces every report section shares: its numbered title and the notice shown when the data
// a section needs was not recorded (each section of the report can be missing on its own).
import { Database } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Callout, buttonClassName } from "@/components/ui";
import styles from "./sections.module.css";

/** "E7 Rules against the trained model": the paper's section id in quiet type, then the title. */
export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <>
      {id ? <span className={styles.eid}>{id}</span> : null}
      {id ? " " : null}
      {children}
    </>
  );
}

/** A small button-looking link to the Dataset screen, where the missing recordings are made. */
export function OpenDatasetLink() {
  return (
    <Link
      to="/dataset"
      className={buttonClassName({ size: "sm", variant: "secondary", className: styles.linkButton })}
    >
      <Database size={16} aria-hidden="true" />
      Open Dataset
    </Link>
  );
}

/** Said in place of a section whose data was not recorded: what is missing and where to record it. */
export function Missing({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Callout tone="info" title={title} action={<OpenDatasetLink />}>
      {children}
    </Callout>
  );
}
