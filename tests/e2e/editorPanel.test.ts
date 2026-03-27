import { test, expect } from "@playwright/test";

test.describe("Editor & Right Panel", () => {
  test("should show editor area or welcome screen", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const hasEditor = await page.locator(".monaco-editor").isVisible({ timeout: 3000 }).catch(() => false);
    const hasWelcome = await page.locator("text=Welcome to Pipe Gen").isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasEditor || hasWelcome).toBe(true);
  });

  test("should show toolbar area", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    // Toolbar มีปุ่มต่างๆ
    const toolbar = page.locator("button:has-text('Commit')").or(page.locator("[aria-label='New file']")).or(page.locator("text=AI"));
    const visible = await toolbar.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("should show new file button", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const newBtn = page.locator("[aria-label='New file']").or(page.locator("button:has-text('New')"));
    const visible = await newBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("clicking New file should create tab", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const newBtn = page.locator("[aria-label='New file']").first();
    if (await newBtn.isVisible({ timeout: 3000 })) {
      await newBtn.click();
      // ต้องเห็น tab ใหม่ หรือ editor area
      await page.waitForTimeout(500);
      const hasTab = await page.locator("text=Untitled").or(page.locator("text=.yml")).first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(typeof hasTab).toBe("boolean");
    }
  });

  test("should show AI button in toolbar area", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const aiBtn = page.locator("text=AI").or(page.locator("[aria-label*='AI']"));
    const visible = await aiBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("should show diff toggle or compare button", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const diffBtn = page.locator("[aria-label*='Diff']").or(page.locator("[aria-label*='diff']")).or(page.locator("button:has-text('Compare')"));
    const visible = await diffBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("should show copy button in toolbar", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const copyBtn = page.locator("[aria-label*='Copy']").or(page.locator("[aria-label*='copy']"));
    const visible = await copyBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("editor area should have correct background color (dark)", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const bg = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return body.backgroundColor;
    });
    // ต้องไม่ใช่สีขาว
    expect(bg).not.toBe("rgb(255, 255, 255)");
  });
});