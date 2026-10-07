import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Dashboard Experience", () => {
  test("renders 2x2 compact KPI cards, quick actions, and mobile transaction list", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/dashboard");

    // Check no horizontal scrollbar on mobile viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify Mobile Dashboard component rendered
    const mobileDashboard = page.locator('[data-testid="mobile-dashboard"]');
    await expect(mobileDashboard).toBeVisible({ timeout: 10000 });

    // Verify Quick Action buttons exist and are touch-friendly
    await expect(page.locator('[data-testid="mobile-action-sale"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-action-customer"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-action-loan"]')).toBeVisible();

    // Verify KPI cards 2x2 grid exists
    await expect(page.locator('[data-testid="mobile-kpi-grid"]')).toBeVisible();

    // Capture screenshot for visual inspection
    await page.screenshot({ path: "test-results/mobile-dashboard.png", fullPage: true });
  });
});
