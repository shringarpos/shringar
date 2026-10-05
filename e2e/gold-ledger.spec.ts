import { test, expect } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";
import fs from "fs";
import path from "path";

const initialSampleLoans = [
  {
    id: "sample-loan-1",
    customer_name: "Aarav Patel",
    contact_no: "9876543210",
    nominee: "Priya Patel",
    address: "Flat 402, Royal Palms, Ahmedabad",
    metal_type: "Gold",
    purity: "22K",
    ornament_details: "Gold Bangles (2 pairs) - 36.4g, 916 Hallmarked",
    loan_date: "2026-09-15",
    closure_date: null,
    loan_amount: 150000,
    duration_months: 12,
    interest_rate: 18,
    interest_amount: 27000,
    total_amount: 177000,
    status: "running",
    created_at: "2026-09-15T10:00:00Z",
    updated_at: "2026-09-15T10:00:00Z",
  },
  {
    id: "sample-loan-2",
    customer_name: "Sunita Verma",
    contact_no: "9811223344",
    nominee: "Amit Verma",
    address: "12 Green Park, New Delhi",
    metal_type: "Silver",
    purity: "92.5%",
    ornament_details: "Silver Utensils & Pooja Thali - 520g",
    loan_date: "2026-08-01",
    closure_date: "2026-10-01",
    loan_amount: 40000,
    duration_months: 6,
    interest_rate: 24,
    interest_amount: 4800,
    total_amount: 44800,
    status: "closed",
    created_at: "2026-08-01T11:00:00Z",
    updated_at: "2026-10-01T15:00:00Z",
  },
];

test.describe("Gold Ledger Functional & UX Tests", () => {
  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    const screenshotDir = path.resolve(process.cwd(), "e2e/screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test("1. Dashboard table, KPI statistics and toolbar filters render properly", async ({ page }) => {
    await setupAuthenticatedContext(page, initialSampleLoans);
    await page.goto("/gold-ledger");

    // Verify page title
    await expect(page.locator("text=Gold Ledger").first()).toBeVisible({ timeout: 15000 });

    // Verify KPI Cards
    await expect(page.locator("text=Running Loan Amount")).toBeVisible();
    await expect(page.locator("text=Total Interest (Running)")).toBeVisible();
    await expect(page.locator("text=Running Loans")).toBeVisible();
    await expect(page.locator("text=Closed Loans")).toBeVisible();

    // Verify Customer rows
    await expect(page.locator("text=Aarav Patel")).toBeVisible();
    await expect(page.locator("text=Sunita Verma")).toBeVisible();

    // Take screenshot for visual inspection
    await page.screenshot({ path: "e2e/screenshots/01-gold-ledger-list.png", fullPage: true });
  });

  test("2. Slide-over LoanDrawer opens smoothly and performs dynamic interest calculation", async ({ page }) => {
    await setupAuthenticatedContext(page, initialSampleLoans);
    await page.goto("/gold-ledger");

    // Click "Add New Loan" button
    const addBtn = page.getByRole("button", { name: /Add New Loan/i });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();

    // Verify Slide-Over Drawer opens
    const drawer = page.locator(".ant-drawer-open .ant-drawer-content");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("New Gold Loan")).toBeVisible();
    await expect(drawer.getByText("Borrower Details")).toBeVisible();
    await expect(drawer.getByText("Pledged Collateral")).toBeVisible();
    await expect(drawer.getByText("Loan Terms & Interest")).toBeVisible();

    // Fill Principal, Duration, Rate
    const principalInput = drawer.locator("input#loan_amount");
    await principalInput.fill("200000");

    const durationInput = drawer.locator("input#duration_months");
    await durationInput.fill("12");

    const rateInput = drawer.locator("input#interest_rate");
    await rateInput.fill("18");

    // Dynamic formula check: (200000 * 18 * 12) / 1200 = 36000 interest, Total = 236000
    await expect(drawer.getByText("₹36,000")).toBeVisible();
    await expect(drawer.getByText("₹2,36,000")).toBeVisible();

    // Capture drawer screenshot
    await page.screenshot({ path: "e2e/screenshots/02-loan-drawer-calculation.png" });
  });

  test("3. Form validation prevents empty submission in LoanDrawer", async ({ page }) => {
    await setupAuthenticatedContext(page, initialSampleLoans);
    await page.goto("/gold-ledger");

    await page.getByRole("button", { name: /Add New Loan/i }).click();
    const drawer = page.locator(".ant-drawer-open .ant-drawer-content");
    await expect(drawer).toBeVisible();

    // Click create without filling required fields
    const submitBtn = drawer.getByRole("button", { name: /Create Loan Record/i });
    await submitBtn.click();

    // Verify error messages
    await expect(drawer.getByText("Enter customer name")).toBeVisible();
    await expect(drawer.getByText("Enter contact phone")).toBeVisible();
    await expect(drawer.getByText("Enter nominee name")).toBeVisible();
    await expect(drawer.getByText("Enter customer address")).toBeVisible();
  });

  test("4. Details view slide-over drawer displays complete borrower & collateral breakdown", async ({ page }) => {
    await setupAuthenticatedContext(page, initialSampleLoans);
    await page.goto("/gold-ledger");

    // Click on Aarav Patel's row to open show drawer
    const customerCell = page.locator("text=Aarav Patel").first();
    await expect(customerCell).toBeVisible({ timeout: 15000 });
    await customerCell.click();

    // Verify Show Drawer content
    const showDrawer = page.locator(".ant-drawer-open .ant-drawer-content");
    await expect(showDrawer).toBeVisible();
    await expect(showDrawer.getByText("Loan Account Details")).toBeVisible();
    await expect(showDrawer.getByText("Financial Summary")).toBeVisible();
    await expect(showDrawer.getByText("Pledged Collateral")).toBeVisible();
    await expect(showDrawer.getByText("Gold Bangles (2 pairs)")).toBeVisible();
    await expect(showDrawer.getByText("Account Timeline")).toBeVisible();

    // Capture show drawer screenshot
    await page.screenshot({ path: "e2e/screenshots/03-loan-details-drawer.png" });
  });

  test("5. Reports view tabs and KPI aggregates operate correctly", async ({ page }) => {
    await setupAuthenticatedContext(page, initialSampleLoans);
    await page.goto("/gold-ledger/reports");

    // Verify Reports Page header
    await expect(page.locator("text=Gold Ledger Reports").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Running Loans").first()).toBeVisible();
    await expect(page.locator("text=Closed Loans").first()).toBeVisible();

    // Verify aggregates
    await expect(page.locator("text=Principal Amount")).toBeVisible();
    await expect(page.locator("text=Total Interest")).toBeVisible();
    await expect(page.locator("text=Total Payable")).toBeVisible();

    // Switch to Closed Loans Tab
    const closedTabBtn = page.locator(".ant-radio-button-wrapper", { hasText: "Closed Loans" });
    await closedTabBtn.click();

    // Verify closure date column appears
    await expect(page.getByRole("columnheader", { name: "CLOSURE DATE" })).toBeVisible();

    // Capture reports screenshot
    await page.screenshot({ path: "e2e/screenshots/04-gold-ledger-reports.png", fullPage: true });
  });
});
