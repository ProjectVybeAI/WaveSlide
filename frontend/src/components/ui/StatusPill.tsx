// StatusPill: a record's state as an icon plus a word ("Overdue"), never colour alone.
// The text stays in --color-text on a tinted background (AA contrast in any palette); only the
// icon takes the tone colour. Map your domain states to the five tones in one place.
import { clsx } from "clsx";
import { Circle, CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./StatusPill.module.css";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const ICONS: Record<StatusTone, LucideIcon> = {
  neutral: Circle,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

export type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
  /** The status in words: "Paid", "Awaiting review". */
  children: ReactNode;
  /** Replace the tone's default icon when the domain has a clearer one (a clock for "Scheduled"). */
  icon?: LucideIcon;
};

export function StatusPill({ tone = "neutral", icon, className, children, ...rest }: StatusPillProps) {
  const Icon = icon ?? ICONS[tone];
  return (
    <span {...rest} className={clsx(styles.pill, styles[tone], className)}>
      <Icon className={styles.icon} aria-hidden="true" />
      <span className={styles.text}>{children}</span>
    </span>
  );
}
