import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile POS Experience", () => {
  test("renders touch-friendly mobile POS with cart and checkout dock", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/sales/new");

    // Check no horizontal scroll overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify Mobile POS is active
    const mobilePos = page.locator('[data-testid="mobile-pos"]');
    await expect(mobilePos).toBeVisible({ timeout: 10000 });

    // Verify Add Item / Select Ornament button exists and add one item
    const addBtn = page.locator('[data-testid="mobile-pos-add-item"]').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Verify Sticky bottom checkout dock exists
    await expect(page.locator('[data-testid="mobile-pos-checkout-dock"]')).toBeVisible();

    // Capture screenshot for visual inspection
    await page.screenshot({ path: "test-results/mobile-pos.png", fullPage: true });
  });
});
