// Select: a Radix Select (a listbox popup with typeahead, arrow keys and Esc) that looks like
// our inputs. Inside a Field it is labelled and described like an Input. Pass `name` to also
// submit the value with a native <form> (Radix renders a hidden <select> for that).
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { Select as RadixSelect } from "radix-ui";
import type { Ref } from "react";
import { useFieldControl } from "./fieldContext";
import styles from "./Select.module.css";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shown while nothing is chosen. Not a label: the Field gives the label. */
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};

export function Select(props: SelectProps) {
  const { options, placeholder = "Choose…", className, id, "aria-label": ariaLabel, ref, ...root } = props;
  const control = useFieldControl({ id });
  // Passing `value` at all means controlled, even while it is undefined (nothing chosen yet).
  // Radix treats undefined as uncontrolled, so "" stands in for "nothing chosen".
  const value = "value" in props ? (props.value ?? "") : undefined;
  return (
    <RadixSelect.Root {...root} value={value} required={control.required}>
      <RadixSelect.Trigger
        ref={ref}
        id={control.id}
        aria-label={ariaLabel}
        aria-describedby={control["aria-describedby"]}
        aria-invalid={control["aria-invalid"]}
        className={clsx(styles.trigger, className)}
      >
        <span className={styles.value}>
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon className={styles.chevron}>
          <ChevronDown aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className={styles.content} position="popper" sideOffset={4} collisionPadding={16}>
          <RadixSelect.Viewport className={styles.viewport}>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={styles.item}
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className={styles.indicator}>
                  <Check aria-hidden="true" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
