import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", fullyParallel: true, forbidOnly: !!process.env.CI, retries: process.env.CI ? 2 : 0,
  reporter: [["html", { outputFolder: "./playwright-report" }], ["list"]],
  use: { baseURL: process.env.BASE_URL || "http://localhost:3000", trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [
    { name: "api", testDir: "./tests/api", testMatch: "**/*.test.ts" },
    { name: "e2e-chromium", testDir: "./tests/e2e", testMatch: "**/*.test.ts", use: { ...devices["Desktop Chrome"], storageState: "./tests/setup/.auth/user.json" }, dependencies: ["auth-setup"] },
    { name: "auth-setup", testDir: "./tests/setup", testMatch: "auth.setup.ts" },
  ],
  webServer: { command: "bun run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
