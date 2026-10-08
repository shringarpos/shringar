import { test, expect } from "@playwright/test";
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
});
