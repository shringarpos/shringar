import { test, expect } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.describe("App Navigation & Sidebar Layout", () => {
  test("1. Sidebar displays Gold Ledger above Metal Rates and routes correctly", async ({ page }) => {
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

    // Verify order: Gold Ledger appears before Metal Rates in sidebar DOM (App.tsx resource order)
    const sidebarText = await sidebar.innerText();
    const metalRatesIndex = sidebarText.indexOf("Metal Rates");
    const goldLedgerIndex = sidebarText.indexOf("Gold Ledger");
    expect(metalRatesIndex).toBeGreaterThan(-1);
    expect(goldLedgerIndex).toBeGreaterThan(-1);
    expect(metalRatesIndex).toBeGreaterThan(goldLedgerIndex);

    // Verify routing to gold ledger
    await page.goto("/gold-ledger");
    await expect(page).toHaveURL(/\/gold-ledger/);
    await expect(page.locator("text=Gold Ledger").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Dead Route Fixes (F1–F3)", () => {
  test("2. Quick-action New Sale navigates to /sales/new", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/");

    // Quick actions render as clickable divs (not <button>), so scope by card.
    const quickActions = page.locator(".ant-card", { hasText: "Quick Actions" });
    await expect(quickActions).toBeVisible({ timeout: 15000 });
    await quickActions.getByText("New Sale", { exact: true }).click();

    await expect(page).toHaveURL(/\/sales\/new/);
    await expect(page.locator(".ant-result-404")).toHaveCount(0);
  });

  test("3. Invoice row action opens /invoices/show/:id", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/invoices");

    const firstRow = page.locator("table tbody tr:not(.ant-table-measure-row)").first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });
    await firstRow.locator("button").first().click();

    await expect(page).toHaveURL(/\/invoices\/show\/.+/);
    await expect(page.locator(".ant-result-404")).toHaveCount(0);
  });

  test("4. Dashboard inventory view-all opens /ornaments", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/");

    // Two "View all" buttons exist (RecentInvoices + InventorySummary);
    // scope to the inventory card. Both render as <button>, not links.
    const inventoryCard = page.locator(".ant-card", { hasText: "Inventory by Category" });
    await expect(inventoryCard).toBeVisible({ timeout: 15000 });
    await inventoryCard.getByRole("button", { name: /view all/i }).click();

    await expect(page).toHaveURL(/\/ornaments/);
    await expect(page.locator(".ant-result-404")).toHaveCount(0);
  });
});
