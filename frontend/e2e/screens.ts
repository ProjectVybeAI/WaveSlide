// The routes and demo screens (PLAN.md "Demo screens"), shared by shots and visual specs.
export type Screen = { name: string; path: string; overlay?: "full" | "compact" };

export const ROUTES: Screen[] = [
  { name: "live", path: "/" },
  { name: "settings", path: "/settings" },
  { name: "practice", path: "/practice" },
  { name: "dataset", path: "/dataset" },
  { name: "evaluation", path: "/evaluation" },
  { name: "not-found", path: "/nope" },
  { name: "overlay", path: "/overlay", overlay: "full" },
];

/** Demo screens with their mocked states (?state= switches MSW fixtures). */
export const DEMO_SCREENS: Screen[] = [
  { name: "overlay-active", path: "/overlay?state=holding", overlay: "full" },
  { name: "overlay-paused", path: "/overlay?state=paused", overlay: "full" },
  { name: "overlay-nohand", path: "/overlay?state=nohand", overlay: "full" },
  { name: "overlay-error", path: "/overlay?state=error", overlay: "full" },
  { name: "live", path: "/?state=default" },
  { name: "settings", path: "/settings?state=default" },
  { name: "practice", path: "/practice?state=default" },
  { name: "dataset", path: "/dataset?state=default" },
  { name: "evaluation", path: "/evaluation?state=default" },
];

export const OVERLAY_SIZE = { full: { width: 340, height: 280 }, compact: { width: 220, height: 56 } };
