// Button: every action in the app. Labels are verbs ("Save lease"), never "Submit" or "OK".
// While `pending`, the button keeps its width (both labels share one grid cell), says what it
// is doing, sets aria-busy and ignores clicks, but stays focusable so keyboard users keep their place.
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { buttonClassName, type ButtonLook } from "./buttonClassName";
import { Spinner } from "./Spinner";
import styles from "./Button.module.css";

export type ButtonProps = Omit<ButtonLook, "className"> &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    /** A Lucide icon before the label. Use it only when it adds meaning. */
    icon?: LucideIcon;
    /** Working on it: shows a spinner and `pendingLabel`, ignores clicks, keeps the width. */
    pending?: boolean;
    /** What the button says while pending ("Saving..."). Defaults to the normal label. */
    pendingLabel?: ReactNode;
    ref?: Ref<HTMLButtonElement>;
  };

export function Button({
  variant,
  size,
  full,
  icon: Icon,
  pending = false,
  pendingLabel,
  className,
  children,
  type = "button",
  disabled,
  onClick,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      {...rest}
      disabled={disabled}
      // aria-disabled, not disabled, while pending: a disabled button drops focus to <body>.
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={(event) => {
        if (pending) {
          event.preventDefault(); // also stops a pending submit button from submitting again
          return;
        }
        onClick?.(event);
      }}
      className={buttonClassName({ variant, size, full, className })}
    >
      <span className={styles.stack}>
        <span className={clsx(styles.face, pending && styles.inactive)} aria-hidden={pending || undefined}>
          {Icon ? <Icon className={styles.icon} aria-hidden="true" /> : null}
          <span className={styles.label}>{children}</span>
        </span>
        <span className={clsx(styles.face, !pending && styles.inactive)} aria-hidden={!pending || undefined}>
          <Spinner size="sm" />
          <span className={styles.label}>{pendingLabel ?? children}</span>
        </span>
      </span>
    </button>
  );
}
