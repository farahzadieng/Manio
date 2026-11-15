import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e-prod",
  use: {
    baseURL: "http://localhost:4175",
    ...devices["iPhone 13"],
    browserName: "chromium",
    channel: process.env.CI ? undefined : "chrome",
    serviceWorkers: "allow",
  },
  webServer: {
    command: "npm run preview -- --port 4175",
    url: "http://localhost:4175",
    reuseExistingServer: !process.env.CI,
  },
});
