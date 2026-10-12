// One settings section: a 264 px explanation column on the left, the controls on the right, ruled
// from the next section. Under 960 px the explanation sits above the controls.
import { useId, type ReactNode } from "react";
import styles from "./SetSection.module.css";

type Props = {
  title: string;
  description: ReactNode;
  /** A small picture or note under the description (the hand-length unit). */
  aside?: ReactNode;
  children: ReactNode;
  /** Controls in two columns on wide screens. */
  columns?: 1 | 2;
};

export function SetSection({ title, description, aside, children, columns = 1 }: Props) {
  const id = useId();
  return (
    <section className={styles.section} aria-labelledby={id}>
      <header className={styles.header}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        <p className={styles.description}>{description}</p>
        {aside}
      </header>
      <div className={columns === 2 ? styles.twoColumns : styles.controls}>{children}</div>
    </section>
  );
}
