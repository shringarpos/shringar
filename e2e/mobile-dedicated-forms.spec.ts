import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Dedicated Full-Screen Forms Audit", () => {
  test("dedicated ornament creation page (/ornaments/new) renders slick cards without horizontal overflow", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/ornaments/new");

    // Wait for form container
    const formPage = page.locator('[data-testid="mobile-ornament-form-page"]');
    await expect(formPage).toBeVisible({ timeout: 15000 });

    // Ensure no horizontal scrolling / overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify back navigation button exists and is clickable
    const backBtn = page.locator('[data-testid="mobile-form-back-btn"]');
    await expect(backBtn).toBeVisible();

    // Verify metal selector buttons and fields exist
    await expect(page.getByText("1. METAL TYPE & KARAT PURITY")).toBeVisible();
    await expect(page.getByText("2. BASIC PIECE DETAILS")).toBeVisible();
    await expect(page.getByText("3. WEIGHT & PURCHASE COST")).toBeVisible();
    await expect(page.getByText("4. STOCK INVENTORY")).toBeVisible();

    // Capture screenshot for subagent audit
    await page.screenshot({
      path: "test-results/audit-mobile-ornament-new.png",
      fullPage: true,
    });
  });

  test("dedicated customer creation page (/customers/new) renders clean contact cards without drawer overflow", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/customers/new");

    // Wait for form container
    const formPage = page.locator('[data-testid="mobile-customer-form-page"]');
    await expect(formPage).toBeVisible({ timeout: 15000 });

    // Ensure no horizontal scrolling / overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify sections exist
    await expect(page.getByText("PRIMARY CONTACT")).toBeVisible();
    await expect(page.getByText("ADDRESS & TAX / ID")).toBeVisible();
    await expect(page.getByText("REFERRAL & NOTES")).toBeVisible();

    // Capture screenshot for subagent audit
    await page.screenshot({
      path: "test-results/audit-mobile-customer-new.png",
      fullPage: true,
    });
  });

  test("dedicated gold loan creation page (/gold-ledger/new) renders live interest preview and clean inputs", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/gold-ledger/new");

    // Wait for form container
    const formPage = page.locator('[data-testid="mobile-gold-loan-form-page"]');
    await expect(formPage).toBeVisible({ timeout: 15000 });

    // Ensure no horizontal scrolling / overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Verify sections and interest badge
    await expect(page.getByText("BORROWER CONTACT")).toBeVisible();
    await expect(page.getByText("PLEDGED COLLATERAL")).toBeVisible();
    await expect(page.getByText("LOAN PRINCIPAL & INTEREST")).toBeVisible();
    await expect(page.getByText("ESTIMATED MONTHLY INTEREST")).toBeVisible();

    // Capture screenshot for subagent audit
    await page.screenshot({
      path: "test-results/audit-mobile-gold-loan-new.png",
      fullPage: true,
    });
  });

  test("tapping Add Item on /ornaments navigates to /ornaments/new", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/ornaments");

    const addBtn = page.locator('[data-testid="mobile-new-ornament-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    await expect(page).toHaveURL(/\/ornaments\/new/);
    await expect(page.locator('[data-testid="mobile-ornament-form-page"]')).toBeVisible();
  });

  test("tapping Add Client on /customers navigates to /customers/new", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/customers");

    const addBtn = page.locator('[data-testid="mobile-new-customer-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    await expect(page).toHaveURL(/\/customers\/new/);
    await expect(page.locator('[data-testid="mobile-customer-form-page"]')).toBeVisible();
  });

  test("tapping New Loan on /gold-ledger navigates to /gold-ledger/new", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/gold-ledger");

    const addBtn = page.locator('[data-testid="mobile-new-loan-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    await expect(page).toHaveURL(/\/gold-ledger\/new/);
    await expect(page.locator('[data-testid="mobile-gold-loan-form-page"]')).toBeVisible();
  });
});
