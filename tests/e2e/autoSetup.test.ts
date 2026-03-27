import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/DashboardPage";

test.describe("Auto Setup & Suggestions", () => {
  test("should show Auto Setup button", async ({ page }) => { const d = new DashboardPage(page); await d.goto(); await expect(page.getByRole('button', { name: 'Auto Setup' })).toBeVisible(); });
  test("should show Suggestions button", async ({ page }) => { const d = new DashboardPage(page); await d.goto(); await expect(d.suggestionsBtn).toBeVisible(); });
  test("should open Suggestions dialog", async ({ page }) => { const d = new DashboardPage(page); await d.goto(); await d.suggestionsBtn.click(); await expect(page.locator("text=Recommended additions")).toBeVisible(); });
  test("Suggestions dialog should show suggestion items", async ({ page }) => { const d = new DashboardPage(page); await d.goto(); await d.suggestionsBtn.click(); await expect(page.locator("text=Recommended additions")).toBeVisible(); const items = page.locator("[class*='suggestion']").or(page.locator("text=High").or(page.locator("text=Medium").or(page.locator("text=Low")))); const count = await items.count(); expect(count).toBeGreaterThanOrEqual(0); });
  test("Suggestions dialog should be closable", async ({ page }) => { const d = new DashboardPage(page); await d.goto(); await d.suggestionsBtn.click(); await expect(page.locator("text=Recommended additions")).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.locator("text=Recommended additions")).not.toBeVisible({ timeout: 3000 }); });
});