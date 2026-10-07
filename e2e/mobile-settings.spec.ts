import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Settings Experience", () => {
  test("renders mobile settings tabs and sections without horizontal scroll and without access requests", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/settings");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    const mobileSettings = page.locator('[data-testid="mobile-settings"]');
    await expect(mobileSettings).toBeVisible({ timeout: 10000 });

    // Verify tabs: making charges and shop should be visible, access requests must NOT be visible
    await expect(page.locator('[data-testid="mobile-settings-tab-making-charges"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-settings-tab-shop"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-settings-tab-access-requests"]')).not.toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: "test-results/mobile-settings.png", fullPage: true });
  });
});
