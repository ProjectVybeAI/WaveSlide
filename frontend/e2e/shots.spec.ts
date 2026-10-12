// Screenshots for design review (not assertions). Output: frontend/screenshots/
import { test } from "@playwright/test";
import { OVERLAY_SIZE, ROUTES } from "./screens";

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
];

for (const route of ROUTES) {
  const viewports = route.overlay ? [{ label: route.overlay, ...OVERLAY_SIZE[route.overlay] }] : VIEWPORTS;
  for (const v of viewports) {
    test(`${route.name} ${v.label} @shots`, async ({ page }) => {
      await page.setViewportSize({ width: v.width, height: v.height });
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500); // let the replay hand arrive
      await page.screenshot({ path: `screenshots/${route.name}-${v.label}.png`, fullPage: true });
    });
  }
}
