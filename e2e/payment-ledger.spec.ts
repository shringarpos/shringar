import { test, expect } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.describe("Sales Payment Ledger & Multi-Pay Lifecycle (Desktop)", () => {
  test("Desktop POS allows partial payment and displays pending balance alert", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/sales/new");

    // Wait for POS form
    await expect(page.locator("text=Point of Sale").or(page.locator("text=New Sale"))).toBeVisible({ timeout: 10000 });

    // Select an ornament to create a non-zero grand total
    const ornamentSelect = page.locator(".ant-select").nth(1);
    await ornamentSelect.click();
    await page.locator(".ant-select-item-option-content").first().click();

    // Verify "Amount Paid Now" label is rendered
    await expect(page.locator("text=Amount Paid Now")).toBeVisible();

    // Verify Quick Presets exist: Full, 50%, ₹0
    await expect(page.getByRole("button", { name: "Full" })).toBeVisible();
    await expect(page.getByRole("button", { name: "50%" })).toBeVisible();
    await expect(page.getByRole("button", { name: "₹0" })).toBeVisible();

    // Click ₹0 preset to test full credit sale
    await page.getByRole("button", { name: "₹0" }).click();

    // Verify Pending Balance / Unpaid alert appears
    await expect(page.locator("text=Bill marked as UNPAID").or(page.locator("text=Pending Balance"))).toBeVisible();
  });

  test("Invoice show page displays Payment Ledger Timeline and opens Record Payment Modal", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/invoices/show/inv-1");

    // Verify invoice show header
    await expect(page.locator("text=Invoice #INV-2026-0001")).toBeVisible({ timeout: 10000 });

    // Verify Payment Ledger & History card is visible
    await expect(page.locator("text=Payment Ledger & History")).toBeVisible();

    // Verify advance payment entry is shown in timeline
    await expect(page.locator("text=Advance via GooglePay")).toBeVisible();
    await expect(page.locator("text=Balance Snapshot:")).toBeVisible();

    // Verify "Record Payment" button exists and opens the modal
    const recordBtn = page.getByRole("button", { name: "Record Payment" }).first();
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    // Verify Modal header
    await expect(page.locator("text=Record Payment Installment")).toBeVisible();
    await expect(page.locator("text=Remaining Due:")).toBeVisible();

    // Verify modal inputs exist: Amount, Mode, Date, Notes
    await expect(page.locator("text=Payment Amount (₹)")).toBeVisible();
    await expect(page.locator("label:has-text('Payment Mode')")).toBeVisible();
    await expect(page.locator("label:has-text('Payment Date')")).toBeVisible();

    // Cancel modal
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator("text=Record Payment Installment")).not.toBeVisible();
  });

  test("Invoices list displays dynamic payment status badges and outstanding dues", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/invoices");

    // Invoices table should be visible
    await expect(page.locator(".ant-table")).toBeVisible({ timeout: 10000 });

    // Status column should have Partial or Paid tag on invoice rows
    await expect(page.locator(".ant-table-row").first()).toBeVisible();
    await expect(page.locator(".ant-table").locator("text=Paid").first()).toBeVisible();
  });
});

test.describe("Sales Payment Ledger (Mobile Screen)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("Mobile POS drawer renders Amount Paid Now controls and presets", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/sales/new");

    // Verify mobile POS container
    await expect(page.locator('[data-testid="mobile-pos"]')).toBeVisible({ timeout: 10000 });

    // Add an item to cart by clicking the add item button
    const addBtn = page.locator('[data-testid="mobile-pos-add-item"]').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Open Checkout Drawer via sticky bottom dock
    const checkoutDock = page.locator('[data-testid="mobile-pos-checkout-dock"]');
    await expect(checkoutDock).toBeVisible();
    const checkoutBtn = checkoutDock.locator("button").first();
    await checkoutBtn.click();

    // Verify "Amount Paid Now" section is rendered inside drawer
    await expect(page.locator("text=Amount Paid Now")).toBeVisible();
    await expect(page.getByRole("button", { name: "Full" })).toBeVisible();
    await expect(page.getByRole("button", { name: "50%" })).toBeVisible();
    await expect(page.getByRole("button", { name: "₹0" })).toBeVisible();
  });

  test("Mobile Invoices list displays due badges and invoice cards", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/invoices");

    // Verify mobile invoices rendered
    await expect(page.locator('[data-testid="mobile-invoices"]')).toBeVisible({ timeout: 10000 });

    // Cards list rendered with status tags
    await expect(page.locator('[data-testid="mobile-invoice-cards-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-invoice-card"]').first()).toBeVisible();
  });
});
