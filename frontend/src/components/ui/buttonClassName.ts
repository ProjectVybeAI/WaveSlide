// The class list for a button look, shared by <Button>, <IconButton> and anything that must
// look like a button but is not one: a router <Link>, a plain <a>, a Radix trigger.
//   <Link to="/leases/new" className={buttonClassName({ variant: "primary" })}>New lease</Link>
import { clsx } from "clsx";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "md" | "sm";

export type ButtonLook = {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Stretch to the container's width (phone forms, dialog footers on narrow screens). */
  full?: boolean | undefined;
  className?: string | undefined;
};

export function buttonClassName({ variant = "secondary", size = "md", full = false, className }: ButtonLook = {}) {
  return clsx(styles.button, styles[variant], styles[size], full && styles.full, className);
}
