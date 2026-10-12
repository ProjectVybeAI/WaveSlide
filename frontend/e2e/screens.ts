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
  { name: "overlay-error", path: "/overlay?state=camera-error", overlay: "full" },
  { name: "overlay-cooldown", path: "/overlay?state=cooldown", overlay: "full" },
  { name: "overlay-compact", path: "/overlay?state=compact", overlay: "compact" },
  { name: "live", path: "/?state=default" },
  { name: "live-permissions-missing", path: "/?state=permissions-missing" },
  { name: "live-camera-unavailable", path: "/?state=camera-unavailable" },
  { name: "settings", path: "/settings?state=default" },
  { name: "settings-ml-unavailable", path: "/settings?state=ml-unavailable" },
  { name: "practice", path: "/practice?state=default" },
  { name: "practice-jumped", path: "/practice?state=jumped" },
  { name: "practice-blanked", path: "/practice?state=blanked" },
  { name: "dataset", path: "/dataset?state=default" },
  { name: "evaluation", path: "/evaluation?state=default" },
];

export const OVERLAY_SIZE = { full: { width: 340, height: 280 }, compact: { width: 220, height: 56 } };
