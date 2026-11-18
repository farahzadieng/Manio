import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:4187", ...devices["iPhone 13"] },
  webServer: {
    command: "npm run dev -- --port 4187 --strictPort",
    url: "http://localhost:4187",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        channel: process.env.CI ? undefined : "chrome",
      },
    },
  ],
});
