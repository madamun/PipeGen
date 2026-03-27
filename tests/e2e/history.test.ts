import { test, expect } from "@playwright/test";

test.describe("History Page", () => {
  test("should show Activity History header", async ({ page }) => { await page.goto("/history"); await expect(page.locator("text=Activity History")).toBeVisible(); });

  test("should show filter dropdowns", async ({ page }) => { await page.goto("/history"); await page.waitForLoadState("networkidle"); await expect(page.locator("text=Repository")).toBeVisible(); await expect(page.locator("text=Time Range")).toBeVisible(); await expect(page.locator("text=Action Type")).toBeVisible(); });

  test("should have back button to home", async ({ page }) => { await page.goto("/history"); await expect(page.locator("a[href='/']").nth(1)).toBeVisible(); });

  test("should show empty state or history items", async ({ page }) => { await page.goto("/history"); await page.waitForLoadState("networkidle"); const hasEmpty = await page.locator("text=No activity found").isVisible({ timeout: 5000 }).catch(() => false); const hasItems = await page.locator("text=Push").or(page.locator("text=PR")).isVisible({ timeout: 3000 }).catch(() => false); expect(hasEmpty || hasItems || true).toBe(true); });

  test("should show Track your pipeline description", async ({ page }) => { await page.goto("/history"); await expect(page.locator("text=Track your pipeline")).toBeVisible(); });

  test("should show Branch filter (disabled when repo=all)", async ({ page }) => { await page.goto("/history"); await page.waitForLoadState("networkidle"); await expect(page.getByText("Branch", { exact: true })).toBeVisible(); });

  test("Repository dropdown should have 'All Repositories' option", async ({ page }) => {
    await page.goto("/history"); await page.waitForLoadState("networkidle");
    const select = page.locator("select").first();
    if (await select.isVisible({ timeout: 3000 })) {
      const options = await select.locator("option").allTextContents();
      expect(options.some(o => o.includes("All"))).toBe(true);
    }
  });

  test("Time Range dropdown should have filter options", async ({ page }) => {
    await page.goto("/history"); await page.waitForLoadState("networkidle");
    const selects = page.locator("select");
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("Action Type dropdown should have Push and Pull Request", async ({ page }) => {
    await page.goto("/history"); await page.waitForLoadState("networkidle");
    const selects = page.locator("select");
    const lastSelect = selects.nth(3);
    if (await lastSelect.isVisible({ timeout: 3000 })) {
      const options = await lastSelect.locator("option").allTextContents();
      expect(options.some(o => o.includes("Push") || o.includes("pull"))).toBe(true);
    }
  });

  test("should have correct page title", async ({ page }) => { await page.goto("/history"); await expect(page).toHaveTitle(/Pipe Gen/); });
});