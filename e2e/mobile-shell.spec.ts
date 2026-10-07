import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Shell Navigation", () => {
  test("1. Renders mobile bottom navigation and more drawer on mobile viewport", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/dashboard");

    // Check bottom navigation exists on mobile
    const bottomNav = page.locator('[data-testid="mobile-bottom-nav"]');
    await expect(bottomNav).toBeVisible({ timeout: 15000 });

    // Verify 5 tabs
    await expect(page.locator('[data-testid="mobile-nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-pos"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-invoices"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-gold_ledger"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-more"]')).toBeVisible();

    // Verify top bar exists on mobile
    await expect(page.locator('[data-testid="mobile-top-bar"]')).toBeVisible();

    // Tap "More" tab to open the drawer
    await page.locator('[data-testid="mobile-nav-more"]').click();
    const moreDrawer = page.locator('[data-testid="mobile-more-drawer"]');
    await expect(moreDrawer).toBeVisible({ timeout: 5000 });

    // Verify items in the drawer
    await expect(page.locator('[data-testid="drawer-item-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="drawer-item-ornaments"]')).toBeVisible();
    await expect(page.locator('[data-testid="drawer-item-categories"]')).toBeVisible();
    await expect(page.locator('[data-testid="drawer-item-settings"]')).toBeVisible();
  });

  test("2. Hides bottom navigation on desktop viewport and displays sidebar", async ({ page }) => {
    // Switch to desktop dimensions
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupAuthenticatedContext(page);
    await page.goto("/dashboard");

    // Sidebar should be visible on desktop
    const sidebar = page.locator(".ant-layout-sider");
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Mobile bottom nav should NOT be visible on desktop
    const bottomNav = page.locator('[data-testid="mobile-bottom-nav"]');
    await expect(bottomNav).not.toBeVisible();
  });
});
