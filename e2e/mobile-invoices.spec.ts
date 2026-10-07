import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Invoices Experience", () => {
  test("renders mobile invoice cards and status filters without horizontal scroll", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/invoices");

    // Verify no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify mobile invoices container rendered
    const mobileInvoices = page.locator('[data-testid="mobile-invoices"]');
    await expect(mobileInvoices).toBeVisible({ timeout: 10000 });

    // Verify status filter chips exist
    await expect(page.locator('[data-testid="mobile-invoice-filter-all"]')).toBeVisible();

    // Verify invoice cards or empty state
    await expect(page.locator('[data-testid="mobile-invoice-cards-list"]')).toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: "test-results/mobile-invoices.png", fullPage: true });
  });
});
