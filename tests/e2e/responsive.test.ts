import { test, expect } from "@playwright/test";

test.describe("Responsive — Mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("dashboard should not crash on mobile", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/"); await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Pipe Gen").first()).toBeVisible();
    const critical = errors.filter(e => !e.includes("favicon") && !e.includes("hydration") && !e.includes("Warning"));
    expect(critical).toHaveLength(0);
  });

  test("login page should render on mobile", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Welcome to Pipe Gen")).toBeVisible();
    await expect(page.locator("text=Continue with GitHub")).toBeVisible();
  });

  test("history page should render on mobile", async ({ page }) => {
    await page.goto("/history");
    await expect(page.locator("text=Activity History")).toBeVisible();
  });
});

test.describe("Responsive — Tablet viewport", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("dashboard should render on tablet", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Pipe Gen").first()).toBeVisible();
  });

  test("login page should render on tablet", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Continue with GitHub")).toBeVisible();
  });
});

test.describe("Responsive — Wide screen", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("dashboard should utilize wide screen", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Pipe Gen").first()).toBeVisible();
  });
});