// Jump links to the report's sections, set like the kit's segmented tabs. They are plain links
// (the report is one long page, not one panel per tab); the one in view is marked as current.
import { useEffect, useState } from "react";
import { SECTION_LINKS } from "./report";
import styles from "./SectionNav.module.css";

/** The id of the section nearest the top of the window, kept up to date while scrolling. */
function useCurrentSection(): string {
  const [current, setCurrent] = useState<string>(SECTION_LINKS[0].id);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Report order decides which of several visible sections is "current".
        const first = SECTION_LINKS.find((link) => visible.has(link.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    for (const link of SECTION_LINKS) {
      const element = document.getElementById(link.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return current;
}

export function SectionNav() {
  const current = useCurrentSection();
  return (
    <nav aria-label="Report sections" className={styles.nav}>
      <ul className={styles.list}>
        {SECTION_LINKS.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              aria-current={current === link.id ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(link.id)?.scrollIntoView({ block: "start" });
              }}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
