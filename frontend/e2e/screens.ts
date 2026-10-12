// The routes and demo screens (PLAN.md "Demo screens"), shared by shots and visual specs.
import { expect, type Page } from "@playwright/test";

export type Screen = {
  name: string;
  path: string;
  overlay?: "full" | "compact";
  /** Gets the screen into its state after it has loaded (a changed setting, a conflict). */
  setup?: (page: Page) => Promise<void>;
};

/** Moves "Swipe distance" from 2.0 to 2.2 hand lengths with the keyboard: one unsaved change. */
async function makeSettingsDirty(page: Page) {
  const slider = page.getByRole("slider", { name: /^Swipe distance/ });
  await slider.focus();
  await slider.press("ArrowRight");
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "2.2");
}

/** Gives "Exit slideshow" the Fist gesture, which another action already owns. */
async function makeMappingConflict(page: Page) {
  await page.getByRole("combobox", { name: "Gesture for Exit slideshow" }).click();
  await page.getByRole("option", { name: "Fist", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Gesture for Exit slideshow" })).toContainText("Fist");
}

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
  { name: "settings-dirty", path: "/settings?state=default", setup: makeSettingsDirty },
  { name: "settings-mapping-conflict", path: "/settings?state=default", setup: makeMappingConflict },
  { name: "settings-ml-unavailable", path: "/settings?state=ml-unavailable" },
  { name: "practice", path: "/practice?state=default" },
  { name: "practice-jumped", path: "/practice?state=jumped" },
  { name: "practice-blanked", path: "/practice?state=blanked" },
  { name: "dataset", path: "/dataset?state=default" },
  { name: "dataset-empty", path: "/dataset?state=empty" },
  { name: "dataset-recording", path: "/dataset?state=recording" },
  { name: "evaluation", path: "/evaluation?state=default" },
  { name: "evaluation-empty", path: "/evaluation?state=empty" },
  { name: "evaluation-running", path: "/evaluation?state=running" },
  { name: "evaluation-synthetic", path: "/evaluation?state=synthetic-data" },
];

export const OVERLAY_SIZE = { full: { width: 340, height: 280 }, compact: { width: 220, height: 56 } };
