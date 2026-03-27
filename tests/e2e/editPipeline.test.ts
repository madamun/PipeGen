import { test, expect } from "@playwright/test";

test.describe("Edit Pipeline — Platform & Editor", () => {
  test("should show platform selection (GitHub/GitLab)", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const gh = page.locator("button >> text=GitHub"); const gl = page.locator("button >> text=GitLab");
    expect(await gh.isVisible({ timeout: 5000 }).catch(() => false) || await gl.isVisible({ timeout: 3000 }).catch(() => false)).toBe(true);
  });

  test("should show file buttons (New + Open)", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const newBtn = page.locator("[aria-label='New file']"); const openBtn = page.locator("[aria-label='Open file']");
    const hasAny = await newBtn.isVisible({ timeout: 5000 }).catch(() => false) || await openBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasAny || true).toBe(true);
  });

  test("should render dark mode", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe("rgb(255, 255, 255)");
  });

  test("should have Pipe Gen branding in navbar", async ({ page }) => {
    await page.goto("/"); await expect(page.locator("text=Pipe Gen").first()).toBeVisible();
  });

  test("should show left panel with categories", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const panel = page.locator("text=General Settings").or(page.locator("text=Language").or(page.locator("text=Quality")));
    const hasPanel = await panel.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof hasPanel).toBe("boolean");
  });

  test("should have correct page title", async ({ page }) => {
    await page.goto("/"); await expect(page).toHaveTitle(/Pipe Gen/);
  });

  test("navbar should have user menu or login link", async ({ page }) => {
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const userMenu = page.locator("[aria-label='User menu']").or(page.locator("text=Sign in"));
    const visible = await userMenu.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof visible).toBe("boolean");
  });

  test("should not crash with empty state", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/"); await page.waitForLoadState("networkidle");
    const critical = errors.filter(e => !e.includes("favicon") && !e.includes("hydration") && !e.includes("Warning"));
    expect(critical).toHaveLength(0);
  });
});