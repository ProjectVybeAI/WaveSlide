// IconButton: a button that shows only an icon. `label` is required by the type, because an
// icon alone means nothing to a screen reader; it becomes the aria-label. For sighted mouse
// users, wrap it in <Tooltip content={label}> (a title attribute would be read twice).
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, Ref } from "react";
import { buttonClassName, type ButtonLook } from "./buttonClassName";
import styles from "./Button.module.css";

export type IconButtonProps = Omit<ButtonLook, "className" | "full"> &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
    icon: LucideIcon;
    /** What the button does, in words: "Close dialog", "Copy order ID". */
    label: string;
    ref?: Ref<HTMLButtonElement>;
  };

export function IconButton({
  icon: Icon,
  label,
  variant = "tertiary",
  size,
  className,
  type = "button",
  ref,
  ...rest
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      {...rest}
      aria-label={label}
      className={buttonClassName({ variant, size, className: clsx(styles.iconOnly, className) })}
    >
      <Icon className={styles.icon} aria-hidden="true" />
    </button>
  );
}
