import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Gold Ledger Experience", () => {
  test("renders loan cards, filter tabs, and new loan button without horizontal scroll", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/gold-ledger");

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify mobile gold ledger is active
    const mobileLedger = page.locator('[data-testid="mobile-gold-ledger"]');
    await expect(mobileLedger).toBeVisible({ timeout: 10000 });

    // Verify filter chips exist
    await expect(page.locator('[data-testid="mobile-loan-filter-all"]')).toBeVisible();

    // Verify new loan button exists
    await expect(page.locator('[data-testid="mobile-new-loan-btn"]')).toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: "test-results/mobile-gold-ledger.png", fullPage: true });
  });
});
