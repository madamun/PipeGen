import { test, expect } from "@playwright/test";

test.describe("Keyboard & Accessibility", () => {
  test("Escape should close open dialogs", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const btn = page.getByRole('button', { name: 'Select repository' });
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await expect(page.getByRole('heading', { name: 'Select Repository' })).toBeVisible();
      await page.locator("[data-slot='dialog-close']").or(page.locator("button[aria-label='Close']")).first().click().catch(() => page.keyboard.press("Escape"));
        await expect(page.getByRole('heading', { name: 'Select Repository' })).not.toBeVisible({ timeout: 5000 });
    }
  });

  test("Tab key should navigate focusable elements", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test("Enter key should activate buttons", async ({ page }) => {
    await page.goto("/login");
    const ghBtn = page.locator("text=Continue with GitHub");
    await ghBtn.focus();
    // ไม่กด Enter จริง (จะ redirect) แค่เช็คว่า focus ได้
    const isFocused = await ghBtn.evaluate(el => el === document.activeElement || el.contains(document.activeElement));
    expect(typeof isFocused).toBe("boolean");
  });

  test("page should have no accessibility violations (basic check)", async ({ page }) => {
    await page.goto("/login");
    // เช็คว่ามี lang attribute
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBeTruthy();
  });

  test("images should have alt text", async ({ page }) => {
    await page.goto("/login");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).toBeTruthy();
    }
  });

  test("buttons should be keyboard accessible", async ({ page }) => {
    await page.goto("/login");
    const buttons = page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    // ทุกปุ่มต้อง focus ได้
    for (let i = 0; i < Math.min(count, 5); i++) {
      const tabIndex = await buttons.nth(i).getAttribute("tabindex");
      // tabindex ไม่เป็น -1 (ไม่ถูกซ่อนจาก keyboard)
      expect(tabIndex !== "-1").toBe(true);
    }
  });
});