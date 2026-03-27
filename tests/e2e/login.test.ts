import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should show login page", async ({ page }) => { await page.goto("/login"); await expect(page.locator("text=Welcome to Pipe Gen")).toBeVisible(); });
  test("should have GitHub button", async ({ page }) => { await page.goto("/login"); await expect(page.locator("text=Continue with GitHub")).toBeVisible(); });
  test("should have GitLab button", async ({ page }) => { await page.goto("/login"); await expect(page.locator("text=Continue with GitLab")).toBeVisible(); });
  test("should not show navbar on login", async ({ page }) => { await page.goto("/login"); await expect(page.locator("nav >> text=Pipe Gen")).not.toBeVisible(); });
  test("should show sign in description", async ({ page }) => { await page.goto("/login"); await expect(page.locator("text=Sign in to manage your CI/CD pipelines")).toBeVisible(); });
  test("should show PipeGen logo", async ({ page }) => { await page.goto("/login"); await expect(page.locator("img[alt='Pipe Gen Logo']")).toBeVisible(); });
  test("should show switch account links", async ({ page }) => { await page.goto("/login"); await expect(page.locator("text=Need to switch accounts?")).toBeVisible(); });
  test("GitHub button should not be disabled initially", async ({ page }) => { await page.goto("/login"); const btn = page.locator("text=Continue with GitHub"); await expect(btn).toBeEnabled(); });
  test("GitLab button should not be disabled initially", async ({ page }) => { await page.goto("/login"); const btn = page.locator("text=Continue with GitLab"); await expect(btn).toBeEnabled(); });
  test("should have correct page title", async ({ page }) => { await page.goto("/login"); await expect(page).toHaveTitle(/Pipe Gen/); });
});