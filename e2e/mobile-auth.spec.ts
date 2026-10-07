import { test, expect, devices } from "@playwright/test";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Auth Experience", () => {
  test("1. Login page mobile optimization and no horizontal overflow", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Verify presence of Google sign in button and request access link
    await expect(page.locator("text=Sign in with Google")).toBeVisible();
    await expect(page.locator("text=Request Access")).toBeVisible();

    // Verify touch button exists
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test("2. Request Access page has mobile app styling and no horizontal overflow", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("domcontentloaded");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Verify mobile-friendly input modes and fields
    const emailInput = page.locator('input[type="email"], input[id*="email"]');
    await expect(emailInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    
    // Check mobile back to login buttons exist
    await expect(page.locator("text=Back to Login").first()).toBeVisible();
  });

  test("3. Approve Access gatekeeper page renders touch buttons cleanly", async ({ page }) => {
    await page.goto("/approve-access?email=test%40example.com&token=mock-token");
    await page.waitForLoadState("domcontentloaded");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await expect(page.locator("text=Admin Gatekeeper")).toBeVisible();
  });
});
