// Baselines of the demo screens (mocked states, so they are stable). A diff means the UI changed:
// intended -> `npm run visual -- --update-snapshots`; unintended -> fix the code.
// Baselines are first created after Phase 1's UI checkpoint.
import { expect, test } from "@playwright/test";
import { DEMO_SCREENS, OVERLAY_SIZE } from "./screens";

for (const screen of DEMO_SCREENS) {
  const sizes = screen.overlay
    ? [OVERLAY_SIZE[screen.overlay]]
    : [1440, 390].map((width) => ({ width, height: 900 }));
  for (const size of sizes) {
    test(`${screen.name} ${size.width} @visual`, async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-01-15T10:00:00"));
      await page.setViewportSize(size);
      await page.goto(screen.path);
      await page.waitForLoadState("networkidle");
      await screen.setup?.(page);
      await expect(page).toHaveScreenshot(`${screen.name}-${size.width}.png`, { fullPage: true });
    });
  }
}
