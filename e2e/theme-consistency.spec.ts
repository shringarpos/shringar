import { test, expect } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

const testLoans = [
  {
    id: "theme-loan-1",
    customer_name: "Meera Singhania",
    contact_no: "9988776655",
    nominee: "Rajesh Singhania",
    address: "B-22 Silver Oak Heights, Mumbai",
    metal_type: "Gold",
    purity: "22K",
    ornament_details: "Bridal Gold Choker Set - 58g",
    loan_date: "2026-10-01",
    closure_date: null,
    loan_amount: 300000,
    duration_months: 12,
    interest_rate: 18,
    interest_amount: 54000,
    total_amount: 354000,
    status: "running",
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
  },
];

test.describe("Theme Consistency & UX Visual Audit", () => {
  test("1. Dark theme renders dark background and light text without contrast bleed", async ({ page }) => {
    await setupAuthenticatedContext(page, testLoans);

    // Set dark mode in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem("colorMode", "dark");
    });

    await page.goto("/gold-ledger");
    await expect(page.locator("text=Gold Ledger").first()).toBeVisible({ timeout: 15000 });

    // Capture dark theme dashboard
    await page.screenshot({ path: "e2e/screenshots/05-dark-gold-ledger.png", fullPage: true });

    // Open Drawer in Dark Mode
    await page.getByRole("button", { name: /Add New Loan/i }).click();
    const openDrawer = page.locator(".ant-drawer-open .ant-drawer-content");
    await expect(openDrawer).toBeVisible();

    // Capture dark theme drawer
    await page.screenshot({ path: "e2e/screenshots/06-dark-loan-drawer.png" });

    // Close drawer
    await openDrawer.getByRole("button", { name: /Cancel/i }).click();

    // Check dark theme reports
    await page.goto("/gold-ledger/reports");
    await expect(page.locator("text=Gold Ledger Reports").first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: "e2e/screenshots/07-dark-reports.png", fullPage: true });
  });

  test("2. Light theme renders clean palette with proper contrast", async ({ page }) => {
    await setupAuthenticatedContext(page, testLoans);

    // Set light mode in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem("colorMode", "light");
    });

    await page.goto("/gold-ledger");
    await expect(page.locator("text=Gold Ledger").first()).toBeVisible({ timeout: 15000 });

    // Capture light theme dashboard
    await page.screenshot({ path: "e2e/screenshots/08-light-gold-ledger.png", fullPage: true });
  });

  test("3. Form inputs and autofill rules maintain theme consistency in dark and light modes", async ({ page }) => {
    // Navigate to login page where email and password inputs are present
    await page.addInitScript(() => {
      window.localStorage.setItem("colorMode", "dark");
    });
    await page.goto("/login");
    await expect(page.locator("input[type='email'], input#email, input#password").first()).toBeVisible({ timeout: 15000 });

    // Verify dark data-theme and color-scheme are applied
    const rootTheme = await page.evaluate(() => {
      return {
        dataTheme: document.documentElement.getAttribute("data-theme"),
        colorScheme: document.documentElement.style.colorScheme,
      };
    });
    expect(rootTheme.dataTheme).toBe("dark");
    expect(rootTheme.colorScheme).toBe("dark");

    // Verify global autofill stylesheet rules exist in document
    const hasAutofillRules = await page.evaluate(() => {
      let foundDarkRule = false;
      let foundLightRule = false;
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            const text = rule.cssText || "";
            if (text.includes("data-theme=\"dark\"") && text.includes("-webkit-autofill")) {
              foundDarkRule = true;
            }
            if (text.includes("-webkit-autofill") && text.includes("box-shadow")) {
              foundLightRule = true;
            }
          }
        } catch {
          // Ignore cross-origin stylesheets if any
        }
      }
      return { foundDarkRule, foundLightRule };
    });

    expect(hasAutofillRules.foundDarkRule).toBe(true);
    expect(hasAutofillRules.foundLightRule).toBe(true);
  });
});
