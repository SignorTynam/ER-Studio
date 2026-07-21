import { defineConfig, devices } from "@playwright/test";

const devServerCommand =
  process.platform === "win32"
    ? "npm.cmd run dev -- --host 127.0.0.1 --port 4175 --strictPort"
    : "npm run dev -- --host 127.0.0.1 --port 4175 --strictPort";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4175",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: devServerCommand,
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_APP_BOOT_DELAY_MS: "3000",
    },
  },
});
