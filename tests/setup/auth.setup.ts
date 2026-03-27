import { test as setup, expect } from "@playwright/test";
import path from "path";
const authFile = path.join(__dirname, ".auth/user.json");
setup("authenticate", async ({ page }) => {
  await page.goto("/");
  await page.context().addCookies([{ name: "better-auth.session_token", value: process.env.TEST_SESSION_TOKEN || "test-token", domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }]);
  await page.goto("/");
  await expect(page.locator("body")).not.toContainText("Continue with GitHub", { timeout: 5000 });
  await page.context().storageState({ path: authFile });
});
