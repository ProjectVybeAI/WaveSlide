// Input and Textarea: text controls styled with tokens. Inside a Field they pick up the
// label, help and error wiring from context; outside one, pass id/aria-* yourself.
import { clsx } from "clsx";
import type { InputHTMLAttributes, Ref, TextareaHTMLAttributes } from "react";
import { useFieldControl } from "./fieldContext";
import styles from "./Input.module.css";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Right-aligned tabular figures, for amounts and quantities. */
  numeric?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function Input({ className, numeric, id, "aria-describedby": describedBy, ref, ...rest }: InputProps) {
  const control = useFieldControl({ id, "aria-describedby": describedBy });
  return (
    <input
      ref={ref}
      {...control}
      {...rest}
      className={clsx(styles.control, numeric && styles.numeric, className)}
    />
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };

export function Textarea({ className, id, "aria-describedby": describedBy, rows = 4, ref, ...rest }: TextareaProps) {
  const control = useFieldControl({ id, "aria-describedby": describedBy });
  return (
    <textarea
      ref={ref}
      rows={rows}
      {...control}
      {...rest}
      className={clsx(styles.control, styles.textarea, className)}
    />
  );
}
