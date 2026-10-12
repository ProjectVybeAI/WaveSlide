// Switch: an on/off setting that takes effect at once (use Checkbox inside forms that are
// saved later). Radix gives role="switch" and aria-checked; the visible "On"/"Off" word means
// the state never depends on colour or thumb position alone.
import { clsx } from "clsx";
import { Switch as RadixSwitch } from "radix-ui";
import { useId, type ReactNode, type Ref } from "react";
import styles from "./Switch.module.css";

export type SwitchProps = {
  label: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  /** Words shown beside the switch for each state. */
  stateLabels?: { on: string; off: string };
  id?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};

export function Switch({
  label,
  description,
  stateLabels = { on: "On", off: "Off" },
  id,
  className,
  ref,
  ...root
}: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const descriptionId = description ? `${switchId}-description` : undefined;
  return (
    <div className={clsx(styles.row, className)}>
      <label htmlFor={switchId} className={styles.label}>
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      ) : null}
      <span className={styles.control}>
        <RadixSwitch.Root
          ref={ref}
          id={switchId}
          aria-describedby={descriptionId}
          className={styles.switch}
          {...root}
        >
          <RadixSwitch.Thumb className={styles.thumb} />
        </RadixSwitch.Root>
        {/* Screen readers already hear "on"/"off" from the switch; this word is for eyes. */}
        <span className={styles.state} aria-hidden="true" data-on={stateLabels.on} data-off={stateLabels.off} />
      </span>
    </div>
  );
}
