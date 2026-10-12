// A fader (Radix Slider): label and value with its unit above, the rail, and the default marked
// underneath, so every number says what it is and where WaveSlide ships it.
import { clsx } from "clsx";
import { Slider as RadixSlider } from "radix-ui";
import { useId, type CSSProperties, type ReactNode } from "react";
import styles from "./Slider.module.css";

type Props = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** The §13 default, marked with a tick. */
  defaultValue: number;
  /** After the value: "hand lengths", "ms", "s". */
  unit: string;
  /** Formats the number: one decimal, or none for milliseconds. */
  format?: (value: number) => string;
  help: ReactNode;
  /** The saved value differs from this one. */
  changed?: boolean;
  /** A picture to the left of the fader (the timing dial previews). */
  leading?: ReactNode;
  className?: string;
};

const oneDecimal = (value: number) => value.toFixed(1);

export function Slider({
  label,
  value,
  onValueChange,
  min,
  max,
  step,
  defaultValue,
  unit,
  format = oneDecimal,
  help,
  changed = false,
  leading,
  className,
}: Props) {
  const id = useId();
  const share = (n: number) => ((n - min) / (max - min)) * 100;
  const text = `${format(value)} ${unit}`;
  return (
    <div className={clsx(styles.slider, leading && styles.withLeading, changed && styles.changed, className)}>
      {leading ? <div className={styles.leading}>{leading}</div> : null}
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.label} id={`${id}-label`}>
            {label}
            {changed ? <span className={styles.tag}>Changed</span> : null}
          </span>
          <span className={styles.value}>
            {format(value)} <small>{unit}</small>
          </span>
        </div>
        <RadixSlider.Root
          className={styles.root}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([next]) => next !== undefined && onValueChange(next)}
        >
          <RadixSlider.Track className={styles.track}>
            <RadixSlider.Range className={styles.range} />
          </RadixSlider.Track>
          <RadixSlider.Thumb className={styles.cap} aria-labelledby={`${id}-label`} aria-valuetext={text} />
          <span
            className={styles.default}
            style={{ "--share": share(defaultValue) } as CSSProperties}
            aria-hidden="true"
          >
            Default {format(defaultValue)}
          </span>
        </RadixSlider.Root>
        <p className={styles.help}>{help}</p>
      </div>
    </div>
  );
}
