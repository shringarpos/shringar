import { test, expect } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.describe("App Navigation & Sidebar Layout", () => {
  test("1. Sidebar displays Gold Ledger below Metal Rates and routes correctly", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/dashboard");

    // Wait for sidebar to render
    const sidebar = page.locator(".ant-layout-sider");
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Verify Metal Rates is visible
    const metalRatesNav = sidebar.locator("text=Metal Rates");
    await expect(metalRatesNav).toBeVisible();

    // Verify Gold Ledger group is visible
    const goldLedgerNav = sidebar.locator("text=Gold Ledger");
    await expect(goldLedgerNav).toBeVisible();

    // Verify order: Metal Rates appears before Gold Ledger in sidebar DOM
    const sidebarText = await sidebar.innerText();
    const metalRatesIndex = sidebarText.indexOf("Metal Rates");
    const goldLedgerIndex = sidebarText.indexOf("Gold Ledger");
    expect(metalRatesIndex).toBeGreaterThan(-1);
    expect(goldLedgerIndex).toBeGreaterThan(-1);
    expect(goldLedgerIndex).toBeGreaterThan(metalRatesIndex);

    // Verify routing to gold ledger
    await page.goto("/gold-ledger");
    await expect(page).toHaveURL(/\/gold-ledger/);
    await expect(page.locator("text=Gold Ledger").first()).toBeVisible({ timeout: 10000 });
  });
});
