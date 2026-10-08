import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

/**
 * Task 5 — Dell-small 1366×768 squeeze fixes.
 * Guards the desktop table/breakpoint contract at 1366px:
 * no page-level overflow, single-line money headers, hidden low-value
 * columns, constrained tags, and stacked dashboard/sale-form layouts.
 */
test.describe("Desktop 1366px squeeze fixes (dell-small)", () => {
  test("1366px: no page overflow, no wrapped money headers", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    for (const route of ["/ornaments", "/gold-ledger", "/invoices"]) {
      await page.goto(route);
      await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3
      );
      expect(overflow).toBe(false);
    }
    await page.goto("/invoices");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });
    // NOTE: antd duplicates fixed-column headers, so match first() instead of count 1
    await expect(page.locator("th:has-text('Making Charges')").first()).toBeVisible();
    // Money header must stay on one line (no 2-line wrap at 1366)
    await expect(page.locator("th span", { hasText: "Making Charges" }).first()).toHaveCSS(
      "white-space",
      "nowrap"
    );
  });

  test("1366px: invoices customer cell is single-line ellipsis", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/invoices");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("tbody tr[data-row-key]").first()).toBeVisible({ timeout: 15000 });
    // Pin the Customer cell specifically (not just any ellipsis cell): the td holding the
    // customer code tag must carry the column ellipsis class, and the customer name itself
    // must render single-line ellipsis styles.
    const customerCell = await page.evaluate(() => {
      const codeTag = [...document.querySelectorAll("tbody td .ant-tag")].find((el) =>
        /^CUST-/.test(el.textContent ?? "")
      );
      const td = codeTag?.closest("td");
      const nameEl = td?.querySelector(".ant-typography-ellipsis");
      if (!td || !nameEl) return null;
      const cs = getComputedStyle(nameEl);
      return {
        tdHasEllipsisClass: td.classList.contains("ant-table-cell-ellipsis"),
        whiteSpace: cs.whiteSpace,
        overflow: cs.overflow,
        textOverflow: cs.textOverflow,
      };
    });
    expect(customerCell).not.toBeNull();
    expect(customerCell?.tdHasEllipsisClass).toBe(true);
    expect(customerCell?.whiteSpace).toBe("nowrap");
    expect(customerCell?.overflow).toBe("hidden");
    expect(customerCell?.textOverflow).toBe("ellipsis");
  });

  test("ornaments Total Cost visible at 1366, hidden below lg", async ({ page }) => {
    // NOTE: antd responsive={["lg"]} means visible at >=992px, so at 1366 the column is shown
    // and the 1366 relief comes from scroll.x=1100, not from hiding. Hiding only kicks in on
    // narrow viewports (e.g. 800px tablet, where the desktop table still renders — the mobile
    // grid only takes over below md=768).
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/ornaments");
    await expect(page.locator("tbody tr[data-row-key]").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("th:has-text('Total Cost')").first()).toBeVisible();
    await page.setViewportSize({ width: 800, height: 768 });
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("th:has-text('Total Cost')")).toHaveCount(0);
  });

  test("1366px: gold ledger hides Duration+Interest, keeps Actions on screen", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/gold-ledger");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("th:has-text('Duration')")).toHaveCount(0);
    await expect(page.locator("th:has-text('Interest')")).toHaveCount(0);
    await expect(page.locator("th:has-text('Actions')").first()).toBeVisible();
  });

  test("1366px: ornaments category tag constrained, qty tag compact", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/ornaments");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });
    const categoryTag = page.locator("td .ant-tag", { hasText: "Necklaces" }).first();
    await expect(categoryTag).toBeVisible();
    await expect(categoryTag).toHaveCSS("max-width", "130px");
    const qtyTag = page.locator("td .ant-tag", { hasText: "pcs" }).first();
    await expect(qtyTag).toBeVisible();
    await expect(qtyTag).toHaveCSS("margin-right", "0px");
  });

  test("1366px: dashboard revenue + metal rates stack full-width", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/dashboard");
    const revenueCard = page.locator(".ant-card", { hasText: "Revenue Overview" }).first();
    const metalCard = page.locator(".ant-card", { hasText: "Today's Metal Rates" }).first();
    await expect(revenueCard).toBeVisible({ timeout: 15000 });
    await expect(metalCard).toBeVisible({ timeout: 15000 });
    const revenueBox = await revenueCard.boundingBox();
    const metalBox = await metalCard.boundingBox();
    expect(revenueBox && metalBox ? metalBox.y >= revenueBox.y + revenueBox.height - 8 : false).toBe(
      true
    );
  });

  test("1366px: customers table scrolls internally", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/customers");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });
    const overflowX = await page
      .locator(".ant-table-content")
      .first()
      .evaluate((el) => getComputedStyle(el).overflowX);
    expect(["auto", "scroll"]).toContain(overflowX);
  });

  test("1100px: sale form stacks until xl so summary is not squeezed", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto("/sales/new");
    const summaryCard = page.locator(".ant-card", { hasText: "Invoice Summary" }).first();
    const customerLabel = page.locator("label", { hasText: "Customer" }).first();
    await expect(summaryCard).toBeVisible({ timeout: 15000 });
    await expect(customerLabel).toBeVisible({ timeout: 15000 });
    const summaryBox = await summaryCard.boundingBox();
    const customerBox = await customerLabel.boundingBox();
    // Stacked: summary starts at the same left edge as the form; side-by-side: offset right
    expect(
      summaryBox && customerBox ? Math.abs(summaryBox.x - customerBox.x) < 60 : false
    ).toBe(true);
  });

  test("1920px: content capped, tables use viewport with fixed action cols", async ({
    page,
  }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1920, height: 1080 });

    // hp#8 — settings content capped + centered (settings root maxWidth 1280).
    // NOTE: brief drafts `main`, but `main` is antd Layout.Content (full-bleed
    // layout chrome by design, 1720px at 1920w) and Refine adds one more
    // full-width wrapper; the cap applies to the page root, so locate the
    // capped wrapper by computed style instead of by DOM depth.
    await page.goto("/settings");
    await expect(page.getByText("Making Charges").first()).toBeVisible({
      timeout: 15000,
    });
    const contentW = await page.evaluate(() => {
      const capped = [...document.querySelectorAll("main div")].find(
        (el) => getComputedStyle(el).maxWidth === "1280px"
      );
      return capped?.getBoundingClientRect().width ?? 9999;
    });
    expect(contentW).toBeLessThanOrEqual(1600);

    // hp#1 — KPI cards stretch past the old 240px cap (auto-fit grid).
    await page.goto("/dashboard");
    const kpiCard = page.locator(".ant-card", { hasText: "Today's Revenue" }).first();
    await expect(kpiCard).toBeVisible({ timeout: 15000 });
    const kpiW = (await kpiCard.boundingBox())?.width ?? 0;
    expect(kpiW).toBeGreaterThan(245);

    // hp#2 — single Save CTA on the sale form (no duplicate in summary).
    await page.goto("/sales/new");
    const summaryCard = page
      .locator(".ant-card", { hasText: "Invoice Summary" })
      .first();
    await expect(summaryCard).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: "Save & Add Another", exact: true })
    ).toHaveCount(1);
    // Summary singularity: the sticky summary holds exactly 1 real CTA button
    // (Save Invoice); the surviving Save & Add Another lives in the top bar only.
    // NOTE: count <button> elements, not role=button — the Discount InputNumber
    // exposes 2 spin-handler spans with role=button.
    await expect(summaryCard.locator("button")).toHaveCount(1);

    // hp#3 — customers: Address capped (no ballooning), Referred By hidden < xl.
    await page.goto("/customers");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("tbody tr[data-row-key]").first()).toBeVisible({
      timeout: 15000,
    });
    // Address column pinned at width 280 + ellipsis (mirrors the Task-5
    // category-tag 130px pin): pre-fix the unpropertioned column measured 239px.
    const addrCell = page.locator("tbody tr[data-row-key] td:nth-child(4)").first();
    await expect(addrCell).toHaveCSS("width", "280px");
    await expect(addrCell).toHaveClass(/ant-table-cell-ellipsis/);
    await page.setViewportSize({ width: 1100, height: 800 });
    await expect(page.locator("th:has-text('Referred By')")).toHaveCount(0);
  });

  test("sale form post-save navigates to /invoices/show/:id (F2-class fix)", async () => {
    // Post-save navigation cannot be exercised in E2E without creating real
    // records, so pin the route string at the source level instead.
    const src = readFileSync(
      new URL("../src/components/invoices/sale-form.tsx", import.meta.url),
      "utf8"
    );
    expect(src).toContain("/invoices/show/${invoiceId}");
    expect(src).toContain("/invoices/show/${existingInvoice.id}");
    expect(src).not.toContain("navigate(`/invoices/${invoiceId}`)");
    expect(src).not.toContain("navigate(`/invoices/${existingInvoice.id}`)");
  });

  test("desktop Add Customer empty OK shows required errors, creates nothing", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/customers");
    await page.getByRole("button", { name: /add customer/i }).click();
    await page.locator(".ant-modal-footer .ant-btn-primary").click();
    await expect(page.locator(".ant-form-item-explain-error").first()).toBeVisible();
  });

  test("390px: dashboard + header CTAs all >= 44px", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForSelector('[data-testid="mobile-dashboard"]', { timeout: 15000 });
    for (const sel of ["button:has-text('New Bill')", "button:has-text('View All')"]) {
      const box = await page.locator(sel).first().boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test("390px: resized header CTAs all >= 44px", async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/invoices");
    await page.waitForSelector('[data-testid="mobile-invoices"]', { timeout: 15000 });
    const saleBox = await page.locator('[data-testid="mobile-invoices"] button:has-text("New Sale")').first().boundingBox();
    expect(saleBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.goto("/gold-ledger");
    await page.waitForSelector('[data-testid="mobile-new-loan-btn"]', { timeout: 15000 });
    const loanBox = await page.locator('[data-testid="mobile-new-loan-btn"]').boundingBox();
    expect(loanBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.goto("/ornaments");
    await page.waitForSelector('[data-testid="mobile-new-ornament-btn"]', { timeout: 15000 });
    const addBox = await page.locator('[data-testid="mobile-new-ornament-btn"]').boundingBox();
    expect(addBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.waitForSelector('button[aria-label="Edit piece"]', { timeout: 15000 });
    const editBox = await page.locator('button[aria-label="Edit piece"]').first().boundingBox();
    expect(editBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(editBox?.width ?? 0).toBeGreaterThanOrEqual(44);

    await page.goto("/customers/new");
    await page.waitForSelector('[data-testid="mobile-customer-form-page"]', { timeout: 15000 });
    const saveBox = await page.locator('[data-testid="mobile-customer-form-page"] header button:has-text("Save")').boundingBox();
    expect(saveBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.goto("/customers");
    await page.waitForSelector('[data-testid="mobile-new-customer-btn"]', { timeout: 15000 });
    const clientBox = await page.locator('[data-testid="mobile-new-customer-btn"]').boundingBox();
    expect(clientBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    // Empty-state Clear Search is a real button too — force the empty state.
    await page.locator('input[placeholder*="Search by name"]').fill("zzz-no-match-xyz");
    await page.waitForSelector("button:has-text('Clear Search')", { timeout: 10000 });
    const clearBox = await page.locator("button:has-text('Clear Search')").first().boundingBox();
    expect(clearBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
