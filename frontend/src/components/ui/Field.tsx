// Field: a visible label above the control, optional help under the label, and the error under
// the control (ui-standards "Forms"). The control inside reads the ids from context, so
// <Field label="Email" error={err}><Input type="email" /></Field> is fully wired for screen readers.
import { clsx } from "clsx";
import { CircleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { FieldContext, type FieldIds } from "./fieldContext";
import styles from "./Field.module.css";

export type FieldProps = {
  label: ReactNode;
  /** One line under the label: format, limits, why it is asked. */
  help?: ReactNode;
  /** A specific message ("Enter a date after 1 Jan 2024"), set after blur or submit. */
  error?: ReactNode;
  /** Shows "(optional)"; mark the few optional fields, not the many required ones. */
  optional?: boolean;
  /** Sets `required` on the control. */
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({ label, help, error, optional, required = false, children, className }: FieldProps) {
  const base = useId();
  const ids: FieldIds = {
    controlId: `${base}-control`,
    helpId: help ? `${base}-help` : undefined,
    errorId: error ? `${base}-error` : undefined,
    invalid: Boolean(error),
    required,
  };
  return (
    <div className={clsx(styles.field, className)}>
      <label className={styles.label} htmlFor={ids.controlId}>
        {label}
        {optional ? <span className={styles.optional}> (optional)</span> : null}
      </label>
      {help ? (
        <p className={styles.help} id={ids.helpId}>
          {help}
        </p>
      ) : null}
      <FieldContext.Provider value={ids}>{children}</FieldContext.Provider>
      {/* The live wrapper is always rendered, so a newly set error is announced. */}
      <div aria-live="polite" className={styles.errorSlot}>
        {error ? (
          <p className={styles.error} id={ids.errorId}>
            <CircleAlert className={styles.errorIcon} aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
