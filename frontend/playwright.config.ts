// Playwright: runs against `npm run dev:replay` (synthetic landmarks, keys only recorded),
// so no webcam and no real key presses are needed. One stack is reused by every suite.
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: [["line"]],
  snapshotPathTemplate: "{testDir}/__screenshots__/{platform}/{arg}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev:replay",
    cwd: "..",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
