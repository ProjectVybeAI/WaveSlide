// Section: a heading (with optional description and actions) over its content, with the same
// spacing everywhere. Space between sections belongs to the page (a grid gap), not to Section.
import { clsx } from "clsx";
import { useId, type HTMLAttributes, type ReactNode } from "react";
import styles from "./Section.module.css";

export type SectionProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  /** Small actions for this section ("Edit", "Export"), right of the heading. */
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  /** A rule under the heading, for long pages with many sections. */
  ruled?: boolean;
};

export function Section({
  title,
  description,
  actions,
  headingLevel = 2,
  ruled = false,
  className,
  children,
  ...rest
}: SectionProps) {
  const id = useId();
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <section {...rest} aria-labelledby={id} className={clsx(styles.section, className)}>
      <div className={clsx(styles.head, ruled && styles.ruled)}>
        <div className={styles.text}>
          <Heading id={id} className={styles[`h${headingLevel}`]}>
            {title}
          </Heading>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
