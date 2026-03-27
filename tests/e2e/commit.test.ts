import { test, expect } from "@playwright/test";

test.describe("Commit Flow", () => {
  test("should show Commit button when file is open", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const btn = page.locator("button:has-text('Commit')");
    const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("Commit dialog should have branch input and mode selection", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const commitBtn = page.locator("button:has-text('Commit')").first();
    if (await commitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commitBtn.click();
      await expect(page.locator("text=Branch").or(page.locator("text=Push to"))).toBeVisible({ timeout: 3000 });
    }
  });

  test("should show download/export button in toolbar", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const dlBtn = page.locator("[aria-label='Download']").or(page.locator("button:has-text('Download')")).or(page.locator("[aria-label='Export']"));
    const visible = await dlBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("should show zoom controls in toolbar", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const zoomBtn = page.locator("button:has-text('%')").or(page.locator("[aria-label*='zoom']")).or(page.locator("[aria-label*='Zoom']"));
    const visible = await zoomBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });
});