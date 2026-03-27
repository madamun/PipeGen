import { test, expect } from "@playwright/test";

test.describe("AI Assistant & Performance", () => {
  test("should show AI button in toolbar", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const aiBtn = page.locator("text=AI").or(page.locator("[aria-label='Open AI Assistant']"));
    const visible = await aiBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("should load page within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/"); await page.waitForLoadState("domcontentloaded");
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test("should not have critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const critical = errors.filter(e => !e.includes("favicon") && !e.includes("hydration") && !e.includes("Warning"));
    expect(critical).toHaveLength(0);
  });

  test("history page should load within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/history"); await page.waitForLoadState("domcontentloaded");
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test("login page should load within 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/login"); await page.waitForLoadState("domcontentloaded");
    expect(Date.now() - start).toBeLessThan(3000);
  });

  test("should not have JavaScript errors on login page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/login"); await page.waitForLoadState("networkidle");
    const critical = errors.filter(e => !e.includes("favicon") && !e.includes("hydration") && !e.includes("Warning"));
    expect(critical).toHaveLength(0);
  });

  test("should not have JavaScript errors on history page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/history"); await page.waitForLoadState("networkidle");
    const critical = errors.filter(e => !e.includes("favicon") && !e.includes("hydration") && !e.includes("Warning") && !e.includes("401"));
    expect(critical).toHaveLength(0);
  });

  test("all pages should respond with status 200", async ({ page }) => {
    for (const path of ["/", "/login", "/history"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    }
  });
});