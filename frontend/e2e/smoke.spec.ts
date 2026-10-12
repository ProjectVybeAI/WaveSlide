import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the settings window shell renders with navigation and the tally", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Live" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of ["Live", "Settings", "Practice deck", "Dataset", "Evaluation lab"]) {
    await expect(nav.getByRole("link", { name })).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Gesture control" })).toContainText(/Live|Paused/);
  await expect(page).toHaveTitle("Live · WaveSlide");
  await nav.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
});

test("the overlay draws the synthetic replay hand from the engine", async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 280 });
  await page.goto("/overlay");
  // The synthetic demo session shows a hand within a few seconds of looping.
  await expect(page.locator("svg circle").first()).toBeAttached({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: "WaveSlide overlay" })).toContainText(/Live|Paused/);
});

test("the Live screen has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
});
