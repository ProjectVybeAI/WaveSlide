// PageHeader: the page's one h1, an optional link back up, one line saying what the page is
// for, and the page's actions. Wide: actions beside the title. Narrow: they wrap underneath.
// The h1 has tabIndex={-1} so the router can move focus to it after navigation.
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** A link up one level. Pass your router's link: back={<Link to="/leases">All leases</Link>}. */
  back?: ReactNode;
  /** The page's actions, primary last. */
  actions?: ReactNode;
  /** Small text beside the title: a status pill, a record id. */
  meta?: ReactNode;
  /** 1 for a page. 2 only where the header is not the page's main heading (a preview, a gallery). */
  headingLevel?: 1 | 2;
};

export function PageHeader({ title, description, back, actions, meta, headingLevel = 1 }: PageHeaderProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <header className={styles.header}>
      {back ? (
        <div className={styles.back}>
          <ChevronLeft className={styles.backIcon} aria-hidden="true" />
          {back}
        </div>
      ) : null}
      <div className={styles.main}>
        <div className={styles.text}>
          <div className={styles.titleRow}>
            <Heading className={styles.title} tabIndex={-1}>
              {title}
            </Heading>
            {meta ? <div className={styles.meta}>{meta}</div> : null}
          </div>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}
