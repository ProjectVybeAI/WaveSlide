// True when the window is the 220 x 56 strip (the desktop shell resized it): the page then draws
// the compact layout whatever the saved setting says.
import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 279px)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

export function useNarrowWindow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
