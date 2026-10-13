// True while a CSS media query matches. For layouts that change structure (a table becomes a list),
// not just spacing: pure CSS changes stay in the stylesheets.
import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Under the 560 px layout switch (DESIGN.md "Widths"). */
export const PHONE_QUERY = "(max-width: 559px)";
