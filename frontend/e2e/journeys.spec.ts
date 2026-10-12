// Phase 1 user journeys against the real UI: the practice deck driven by the synthetic replay,
// the settings conflict and save flow (mocked engine via ?state=), and the overlay states.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
}

test("the practice deck follows the synthetic replay gestures", async ({ page }) => {
  test.setTimeout(90_000);
  // Record every heading text the deck shows, so a fast change between polls is not missed.
  await page.addInitScript(() => {
    const seen: string[] = [];
    const tally: string[] = [];
    (window as unknown as { __seen: string[]; __tally: string[] }).__seen = seen;
    (window as unknown as { __seen: string[]; __tally: string[] }).__tally = tally;
    const watch = () => {
      const heading = document.getElementById("deck-title");
      const text = heading?.textContent?.replace(/\s+/g, " ").trim();
      if (text && seen[seen.length - 1] !== text) seen.push(text);
      const word = document.querySelector('[aria-label="Gesture control"] p')?.textContent?.trim();
      if (word && tally[tally.length - 1] !== word) tally.push(word);
    };
    new MutationObserver(watch).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.goto("/practice");
  await expect(page.getByRole("heading", { level: 1, name: "Practice deck" })).toBeVisible();
  await expectNoSeriousViolations(page);

  const seen = () => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
  // Slide 2, 3, back to 2, jump to 3, blank, unblank (the replay loops, so any lap contains them).
  const expected = [
    "Slide 2 of 10",
    "Slide 3 of 10",
    "Slide 2 of 10",
    "Slide 3 of 10",
    "Slide 3 of 10, screen blanked",
    "Slide 3 of 10",
  ];
  await expect
    .poll(
      async () => {
        const log = await seen();
        let next = 0;
        for (const entry of log) if (entry === expected[next]) next += 1;
        return next;
      },
      { timeout: 60_000, intervals: [500] },
    )
    .toBe(expected.length);

  // The scripted session ends with a held thumbs up: the engine goes from Live to Paused.
  await expect
    .poll(
      async () => {
        const words = await page.evaluate(() => (window as unknown as { __tally: string[] }).__tally);
        return words.indexOf("Paused", words.indexOf("Live") + 1) > words.indexOf("Live") && words.includes("Live");
      },
      { timeout: 30_000, intervals: [500] },
    )
    .toBe(true);
});

test("the deck also answers the keyboard", async ({ page }) => {
  await page.goto("/practice?state=default");
  await expect(page.getByRole("heading", { level: 1, name: "Practice deck" })).toBeVisible();
  await expect(page.locator("#deck-title")).toHaveText(/Slide 1 of 10/);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#deck-title")).toHaveText(/Slide 2 of 10/);
  await page.keyboard.press("b");
  await expect(page.locator("#deck-title")).toHaveText(/screen blanked/);
});

test("settings: a gesture conflict blocks saving until it is fixed", async ({ page }) => {
  await page.goto("/settings?state=default");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expectNoSeriousViolations(page);

  const nextGesture = page.getByRole("combobox", { name: "Gesture for Next slide" });
  const previousGesture = page.getByRole("combobox", { name: "Gesture for Previous slide" });
  const original = (await previousGesture.textContent())?.trim() ?? "";
  // Give Next slide the gesture Previous slide already owns.
  await nextGesture.click();
  await page.getByRole("option", { name: original, exact: true }).click();

  await expect(page.getByText(/already goes back a slide/)).toBeVisible();
  const bar = page.getByRole("region", { name: "Unsaved changes" });
  await expect(bar.getByRole("button", { name: "Save settings" })).toBeDisabled();

  await bar.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByText(/already goes back a slide/)).toHaveCount(0);
  await expect(bar).toHaveCount(0);
});

test("settings: changing a slider saves and confirms", async ({ page }) => {
  await page.goto("/settings?state=default");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  const bar = page.getByRole("region", { name: "Unsaved changes" });
  await expect(bar).toContainText(/1 unsaved change/);
  await bar.getByRole("button", { name: "Save settings" }).click();
  await expect(bar).toContainText("Settings saved");
});

test("settings: the recogniser choice explains why ML is unavailable", async ({ page }) => {
  await page.goto("/settings?state=ml-unavailable");
  await expect(page.getByText(/Train a model in Dataset/).first()).toBeVisible();
});

const overlayStates: [string, RegExp][] = [
  ["paused", /Paused/],
  ["nohand", /hand/i],
  ["camera-error", /camera/i],
  ["cooldown", /Live|cooldown/i],
];
for (const [state, text] of overlayStates) {
  test(`the overlay shows its ${state} state in words`, async ({ page }) => {
    await page.setViewportSize({ width: 340, height: 280 });
    await page.goto(`/overlay?state=${state}`);
    await expect(page.getByRole("region", { name: "WaveSlide overlay" })).toContainText(text);
  });
}

test("the overlay has no serious accessibility violations", async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 280 });
  await page.goto("/overlay?state=holding");
  await expect(page.getByRole("region", { name: "WaveSlide overlay" })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test("the Live screen shows the setup check when permissions are missing", async ({ page }) => {
  await page.goto("/?state=permissions-missing");
  await expect(page.getByRole("heading", { level: 1, name: "Live" })).toBeVisible();
  await expect(page.getByText(/Accessibility/).first()).toBeVisible();
});
