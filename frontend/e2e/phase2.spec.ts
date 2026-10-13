// Phase 2 user journeys: the dataset screen, the evaluation lab and the ML switch in Settings.
// Empty and running states use the mocked engine (?state=); refusing a recording and training the
// model use the real replay engine with the seeded sessions (`npm run seed`).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
}

test("dataset: with no sessions it explains what to do and offers a recording", async ({ page }) => {
  await page.goto("/dataset?state=empty");
  await expect(page.getByRole("heading", { level: 1, name: "Dataset" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No sessions yet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No trained model yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record session" }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
});

test("dataset: the session list shows the seeded sessions and a trained model card", async ({ page }) => {
  await page.goto("/dataset?state=default");
  await expect(page.getByRole("heading", { name: "Sessions", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete session synthetic-gestures-p1", exact: true })).toBeVisible();
  await expect(page.getByText("Macro-F1, leave one participant out")).toBeVisible();
  await expectNoSeriousViolations(page);
});

test("dataset: recording is refused while replaying and the reason shows inline", async ({ page }) => {
  await page.goto("/dataset");
  await expect(page.getByRole("heading", { level: 1, name: "Dataset" })).toBeVisible();
  await page.getByRole("button", { name: "Record session" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Record a session" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("No camera while replaying")).toBeVisible();
  // The button is disabled in replay mode, so the engine's CAMERA_REQUIRED refusal is checked directly too.
  await expect(dialog.getByRole("button", { name: "Start recording" })).toBeDisabled();
  const refusal = await page.request.post("/api/recordings", {
    data: { protocol: "gestures", participant: "e2e", distance_m: 1, lighting: "normal" },
  });
  expect(refusal.status()).toBe(409);
  expect((await refusal.json()).error.code).toBe("CAMERA_REQUIRED");
});

test.describe("train, then switch the recogniser", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("dataset: training on the seed data shows the model card", async ({ page }) => {
    await page.goto("/dataset");
    await expect(page.getByRole("button", { name: "Delete session synthetic-gestures-p1", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Train model$|^Train again$/ }).click();
    await expect(page.getByText("Macro-F1, leave one participant out")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/Participants: .*p1.*p2.*p3/)).toBeVisible();
  });

  test("settings: after training the recogniser can be set to the trained model and saved", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Trained model available")).toBeVisible();
    const choice = page.getByRole("tab", { name: "Trained model" });
    await choice.click();
    const bar = page.getByRole("region", { name: "Unsaved changes" });
    await bar.getByRole("button", { name: "Save settings" }).click();
    await expect(bar).toContainText("Settings saved");
    await expect(choice).toHaveAttribute("aria-selected", "true");
    // Put the demo back on the rules so later runs start the same way.
    await page.getByRole("tab", { name: "Rules" }).click();
    await bar.getByRole("button", { name: "Save settings" }).click();
    await expect(bar).toContainText("Settings saved");
  });
});

test("evaluation: every section and both confusion matrices render", async ({ page }) => {
  await page.goto("/evaluation?state=default");
  await expect(page.getByRole("heading", { level: 1, name: "Evaluation lab" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Report sections" });
  await expect(nav).toBeVisible();
  for (const id of ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8"]) {
    await expect(page.getByRole("heading", { name: new RegExp(`^${id}\\b`) }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { level: 3, name: /^Rules/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: /^Trained model/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /^Rules, \d+ poses/ })).toHaveCount(1);
  await expect(page.getByRole("table", { name: /^Trained model, \d+ poses/ })).toHaveCount(1);
  await expectNoSeriousViolations(page);
});

test("evaluation: no runs yet shows an empty state with a way to start", async ({ page }) => {
  await page.goto("/evaluation?state=empty");
  await expect(page.getByRole("heading", { name: "No evaluation runs yet" })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test("evaluation: a running evaluation shows its progress", async ({ page }) => {
  await page.goto("/evaluation?state=running");
  await expect(page.getByRole("progressbar").or(page.locator("progress")).first()).toBeVisible();
  await expectNoSeriousViolations(page);
});

test("evaluation: synthetic data is flagged", async ({ page }) => {
  await page.goto("/evaluation?state=synthetic-data");
  await expect(page.getByText("Synthetic sessions").first()).toBeVisible();
});
