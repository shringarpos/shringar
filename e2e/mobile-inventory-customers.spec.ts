import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Customers and Inventory Experience", () => {
  test("renders mobile customers card list without horizontal scroll", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/customers");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    const mobileCustomers = page.locator('[data-testid="mobile-customers"]');
    await expect(mobileCustomers).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="mobile-new-customer-btn"]')).toBeVisible();

    await page.screenshot({ path: "test-results/mobile-customers.png", fullPage: true });
  });

  test("renders mobile ornaments catalog grid without horizontal scroll", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/ornaments");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    const mobileOrnaments = page.locator('[data-testid="mobile-ornaments"]');
    await expect(mobileOrnaments).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="mobile-new-ornament-btn"]')).toBeVisible();

    await page.screenshot({ path: "test-results/mobile-ornaments.png", fullPage: true });
  });
});
