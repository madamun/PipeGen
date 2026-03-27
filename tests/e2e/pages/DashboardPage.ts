import { type Page, type Locator, expect } from "@playwright/test";
export class DashboardPage {
  readonly page: Page;
  readonly autoSetupBtn: Locator; readonly suggestionsBtn: Locator; readonly commitBtn: Locator;
  constructor(page: Page) { this.page = page; this.autoSetupBtn = page.locator("text=Auto Setup"); this.suggestionsBtn = page.locator("text=Suggestions"); this.commitBtn = page.locator("text=Commit"); }
  async goto() { await this.page.goto("/"); await this.page.waitForLoadState("networkidle"); }
  async expectLoaded() { await expect(this.page.locator("text=Pipe Gen")).toBeVisible(); }
  async expectDarkMode() { const bg = await this.page.evaluate(() => getComputedStyle(document.body).backgroundColor); expect(bg).not.toBe("rgb(255, 255, 255)"); }
  async expectWelcome() { await expect(this.page.locator("text=Welcome to Pipe Gen")).toBeVisible(); }
}
