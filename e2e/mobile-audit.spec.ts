import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Full Mobile App Experience Audit", () => {
  test("audits all screens on mobile app viewport", async ({ page }) => {
    // 1. Auth pages
    await page.goto("/request-access");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/audit-request-access.png", fullPage: true });

    await page.goto("/create-account?token=mock-token");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/audit-create-account.png", fullPage: true });

    // 2. Authenticated app shell and pages
    await setupAuthenticatedContext(page);

    // Dashboard
    await page.goto("/");
    await page.waitForSelector('[data-testid="mobile-dashboard"]', { timeout: 10000 });
    await page.screenshot({ path: "test-results/audit-dashboard.png", fullPage: true });

    // POS
    await page.goto("/sales/new");
    await page.waitForSelector('[data-testid="mobile-pos"]', { timeout: 10000 });
    await page.screenshot({ path: "test-results/audit-pos.png", fullPage: true });

    // Invoices
    await page.goto("/invoices");
    await page.waitForSelector('[data-testid="mobile-invoices"]', { timeout: 10000 });
    await page.screenshot({ path: "test-results/audit-invoices.png", fullPage: true });

    // Gold Ledger
    await page.goto("/gold-ledger");
    await page.waitForSelector('[data-testid="mobile-gold-ledger"]', { timeout: 10000 });
    await page.screenshot({ path: "test-results/audit-gold-ledger.png", fullPage: true });

    // Customers
    await page.goto("/customers");
    await page.waitForSelector('[data-testid="mobile-customers"]', { timeout: 10000 });
    await page.screenshot({ path: "test-results/audit-customers.png", fullPage: true });

    // Ornaments
    await page.goto("/ornaments");
    await page.waitForSelector('[data-testid="mobile-ornaments"]', { timeout: 10000 });
    await page.screenshot({ path: "test-results/audit-ornaments.png", fullPage: true });

    // Settings
    await page.goto("/settings");
    await page.waitForSelector('[data-testid="mobile-settings"]', { timeout: 10000 });
    await page.screenshot({ path: "test-results/audit-settings.png", fullPage: true });
  });
});
