import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Mobile Full Interaction & Overflow Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedContext(page);
  });

  test("1. Mobile Shell & Metal Rates Ticker quick drawer interaction", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="mobile-metal-rates-bar"]', { timeout: 10000 });

    const rateBar = page.locator('[data-testid="mobile-metal-rates-bar"]');
    await expect(rateBar).toBeVisible();

    // Verify Gold and Silver rates in the bar
    await expect(rateBar.getByText("GOLD")).toBeVisible();
    await expect(rateBar.getByText("SILVER")).toBeVisible();

    // Click Update button on rates bar
    const updateBtn = page.locator('[data-testid="mobile-rate-edit-btn"]');
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();

    // Drawer should open
    await expect(page.locator("text=Today's Metal Rates")).toBeVisible();
    await expect(page.locator("text=Gold Rate")).toBeVisible();
    await expect(page.locator("text=Silver Rate")).toBeVisible();

    // Verify Save Rates button is clickable
    const saveBtn = page.locator("button:has-text(\"Save Today's Rates\")");
    await expect(saveBtn).toBeVisible();

    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    // Close drawer
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "test-results/mobile-rates-bar.png" });
  });

  test("2. Mobile Dashboard buttons, KPI cards, and layout", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="mobile-dashboard"]', { timeout: 10000 });

    // Verify net sales card
    await expect(page.locator('[data-testid="mobile-hero-sales-card"]')).toBeVisible();

    // Verify 4 Quick Action buttons
    await expect(page.locator('[data-testid="mobile-action-sale"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-action-customer"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-action-add-ornament"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-action-loan"]')).toBeVisible();

    // Verify 3 KPI cards
    await expect(page.locator('[data-testid="mobile-kpi-grid"]')).toBeVisible();
    await expect(page.locator("text=Clients")).toBeVisible();
    await expect(page.locator("text=Gold Stock")).toBeVisible();
    await expect(page.locator("text=Pieces")).toBeVisible();

    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: "test-results/mobile-dashboard.png", fullPage: true });
  });

  test("3. Mobile POS checkout, cart stepper, customer selection, and sale flow", async ({ page }) => {
    await page.goto("/sales/new");
    await page.waitForSelector('[data-testid="mobile-pos"]', { timeout: 10000 });

    const pos = page.locator('[data-testid="mobile-pos"]');
    await expect(pos.getByText("Customer", { exact: true })).toBeVisible();

    // Add item to cart
    const addBtns = page.locator('[data-testid="mobile-pos-add-item"]');
    await expect(addBtns.first()).toBeVisible();
    await addBtns.first().click();

    // Cart dock should appear at bottom
    const checkoutDock = page.locator('[data-testid="mobile-pos-checkout-dock"]');
    await expect(checkoutDock).toBeVisible();

    // Open review and pay drawer
    await page.click("button:has-text('Review & Pay')");
    await expect(page.locator("text=Order Summary & Payment")).toBeVisible();
    await expect(page.locator("text=Select Payment Mode")).toBeVisible();

    // Verify payment mode options
    await expect(page.locator("button:has-text('Cash')")).toBeVisible();
    await expect(page.locator("button:has-text('UPI / QR')")).toBeVisible();

    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: "test-results/mobile-pos-checkout.png" });

    // Close drawer
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "test-results/mobile-pos.png", fullPage: true });
  });

  test("4. Mobile Customers search and Add Client modal", async ({ page }) => {
    await page.goto("/customers");
    await page.waitForSelector('[data-testid="mobile-customers"]', { timeout: 10000 });

    // Verify Add Client button
    const addBtn = page.locator('[data-testid="mobile-add-customer-btn"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Modal should be opened
    const modal = page.locator(".ant-modal-content");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Full Name")).toBeVisible();
    await expect(modal.getByText("Phone", { exact: true })).toBeVisible();

    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: "test-results/mobile-customers-modal.png" });

    // Close modal
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "test-results/mobile-customers.png", fullPage: true });
  });

  test("5. Mobile Ornaments stock, metal filters, and Add Piece drawer", async ({ page }) => {
    await page.goto("/ornaments");
    await page.waitForSelector('[data-testid="mobile-ornaments"]', { timeout: 10000 });

    const ornPage = page.locator('[data-testid="mobile-ornaments"]');
    await expect(ornPage.getByRole("button", { name: "All" })).toBeVisible();
    await expect(ornPage.getByRole("button", { name: "Gold" })).toBeVisible();
    await expect(ornPage.getByRole("button", { name: "Silver" })).toBeVisible();

    // Click Gold filter pill
    await ornPage.getByRole("button", { name: "Gold" }).click();

    // Click Add Piece button
    const addBtn = page.locator('[data-testid="mobile-new-ornament-btn"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Drawer should open
    await expect(page.locator(".ant-drawer-content")).toBeVisible();

    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: "test-results/mobile-ornaments-drawer.png" });

    // Close drawer
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "test-results/mobile-ornaments.png", fullPage: true });
  });

  test("6. Mobile Gold Ledger tabs and New Loan drawer", async ({ page }) => {
    await page.goto("/gold-ledger");
    await page.waitForSelector('[data-testid="mobile-gold-ledger"]', { timeout: 10000 });

    // Verify filter tabs
    await expect(page.locator("button:has-text('Active')")).toBeVisible();
    await expect(page.locator("button:has-text('Closed')")).toBeVisible();

    // Click New Loan button
    const addBtn = page.locator('[data-testid="mobile-add-loan-btn"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Drawer should open
    await expect(page.locator(".ant-drawer-content")).toBeVisible();

    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: "test-results/mobile-gold-ledger-drawer.png" });

    // Close drawer
    await page.keyboard.press("Escape");
    await page.screenshot({ path: "test-results/mobile-gold-ledger.png", fullPage: true });
  });

  test("7. Mobile Invoices list and navigation", async ({ page }) => {
    await page.goto("/invoices");
    await page.waitForSelector('[data-testid="mobile-invoices"]', { timeout: 10000 });

    const invPage = page.locator('[data-testid="mobile-invoices"]');
    await expect(invPage.getByRole("button", { name: "All" })).toBeVisible();
    await expect(invPage.getByRole("button", { name: "Paid", exact: true })).toBeVisible();

    // Check no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: "test-results/mobile-invoices.png", fullPage: true });
  });
});
