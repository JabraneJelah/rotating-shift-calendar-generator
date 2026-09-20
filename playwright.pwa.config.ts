import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-pwa",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3100",
    serviceWorkers: "allow",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-pwa",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
