// Callout: an inline message block in the flow of a page or form: guidance (info), a caution
// (warning), a failure (danger) or a confirmation (success). Toasts are for background events;
// the result of something the person just did belongs here, next to where they did it.
import { clsx } from "clsx";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Callout.module.css";

const ICONS = { info: Info, warning: TriangleAlert, danger: CircleAlert, success: CircleCheck };

export type CalloutProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  tone?: keyof typeof ICONS;
  title?: ReactNode;
  children?: ReactNode;
  /** Actions for the message ("Review the clause"). */
  action?: ReactNode;
};

export function Callout({ tone = "info", title, children, action, className, ...rest }: CalloutProps) {
  const Icon = ICONS[tone];
  return (
    <div {...rest} className={clsx(styles.callout, styles[tone], className)}>
      <Icon className={styles.icon} aria-hidden="true" />
      <div className={styles.text}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.body}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </div>
  );
}
