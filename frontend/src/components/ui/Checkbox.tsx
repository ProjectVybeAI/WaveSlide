// Checkbox: a Radix checkbox with its label beside it. The whole label is clickable, and the
// box itself is a 24 px target (WCAG 2.5.8) even though the drawn square is smaller.
import { clsx } from "clsx";
import { Check, Minus } from "lucide-react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { useId, type ReactNode, type Ref } from "react";
import styles from "./Checkbox.module.css";

export type CheckboxProps = {
  label: ReactNode;
  /** A line under the label that explains the consequence. */
  description?: ReactNode;
  /** true, false, or "indeterminate" (some of a group are selected). */
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  id?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};

export function Checkbox({ label, description, id, className, ref, ...root }: CheckboxProps) {
  const autoId = useId();
  const boxId = id ?? autoId;
  const descriptionId = description ? `${boxId}-description` : undefined;
  return (
    <div className={clsx(styles.row, className)}>
      <RadixCheckbox.Root ref={ref} id={boxId} aria-describedby={descriptionId} className={styles.box} {...root}>
        <RadixCheckbox.Indicator className={styles.indicator}>
          {root.checked === "indeterminate" ? <Minus aria-hidden="true" /> : <Check aria-hidden="true" />}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <label htmlFor={boxId} className={styles.label}>
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
