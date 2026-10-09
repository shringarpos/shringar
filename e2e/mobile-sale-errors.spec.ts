import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

// Task 1: customer creation errors (address 23502 + gst_number/pan schema
// cache + pan optional + empty user text). E2E writes are forbidden, so this
// spec asserts at two levels: (a) UI — Address input visible+required and
// GSTIN/PAN inputs ABSENT from customer forms; (b) source — payload builders
// never emit non-schema keys. Mock-auth fulfills all REST traffic; no form
// here ever reaches a real backend.
const src = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), "utf8");

test.describe("Task 1: customer creation errors", () => {
  test("quick-add client payload has address and no gst_number key", async ({
    page,
  }) => {
    // Source pin: quick-add ships address, never gst_number/pan keys.
    const pos = src("../src/pages/pos/mobile-pos.tsx");
    expect(pos).not.toMatch(/gst_number|pan_number/);
    expect(pos).toMatch(/address:\s*quickClientAddress\.trim\(\)/);

    // UI pin (390px renders MobilePOS): required Address input present;
    // empty-address save is blocked client-side with zero POST traffic;
    // a complete save POSTs address and never gst_number/pan keys (mock
    // route fulfills in-memory — no real records).
    const posts: any[] = [];
    page.on("request", (r) => {
      if (
        r.url().includes("/rest/v1/customers") &&
        r.method() === "POST"
      )
        posts.push(r.postDataJSON());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/sales/new");
    await expect(page.locator('[data-testid="mobile-pos"]')).toBeVisible({
      timeout: 15000,
    });
    await page.getByText("Select or Add Customer").click();
    await page.getByRole("button", { name: /quick add/i }).click();
    const addressInput = page.locator(
      '[data-testid="mobile-pos-quickadd-address"]'
    );
    await expect(addressInput).toBeVisible();
    const box = await addressInput.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page
      .locator('input[placeholder="Client Name *"]')
      .fill("QA Address Pin");
    await page.getByRole("button", { name: /save & select client/i }).click();
    await page.waitForTimeout(800);
    expect(posts).toHaveLength(0);
    await expect(addressInput).toBeVisible();
    await addressInput.fill("14 Task Lane, Mumbai");
    await page
      .locator('input[placeholder="Phone Number (optional)"]')
      .fill("9876543210");
    await page.getByRole("button", { name: /save & select client/i }).click();
    await expect
      .poll(() => posts.length, { timeout: 10000 })
      .toBeGreaterThan(0);
    const payload = posts[posts.length - 1];
    expect(payload.address).toBe("14 Task Lane, Mumbai");
    expect(payload).not.toHaveProperty("gst_number");
    expect(payload).not.toHaveProperty("pan_number");
    expect(payload).not.toHaveProperty("pan");
  });

  test("mobile customer form has required address, no GSTIN/PAN inputs", async ({
    page,
  }) => {
    // Source pin: no non-schema keys, address carries a required rule.
    const form = src("../src/pages/customers/mobile-customer-form.tsx");
    expect(form).not.toMatch(/gst_number|pan_number/);
    expect(form).not.toContain("notes: values.notes");
    expect(form).toMatch(/name="address"[\s\S]{0,300}?required/);

    // UI pin.
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/customers/new");
    await expect(
      page.locator('[data-testid="mobile-customer-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Postal Address")).toBeVisible();
    await expect(page.getByText("GSTIN", { exact: true })).toHaveCount(0);
    await expect(page.getByText("PAN Number")).toHaveCount(0);
  });

  test("desktop sale customer select empty text is No existing user", async ({
    page,
  }) => {
    // Source pin.
    const sale = src("../src/components/invoices/sale-form.tsx");
    expect(sale).toContain('notFoundContent="No existing user"');

    // UI pin: a hopeless search renders the copy, not antd's "No Data".
    // NOTE: #customer_id IS the combobox input itself (antd puts the id on
    // the search input), so fill it directly — `#customer_id input` matches
    // nothing.
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupAuthenticatedContext(page);
    await page.goto("/sales/new");
    await page.locator("#customer_id").click();
    await page.locator("#customer_id").fill("zzz-no-such-client");
    await expect(
      page.locator(".ant-select-dropdown").getByText("No existing user")
    ).toBeVisible();
    await expect(
      page.locator(".ant-select-dropdown").getByText("No Data")
    ).toHaveCount(0);
  });

  test("mobile POS client drawer shows No existing user on empty search", async ({
    page,
  }) => {
    // Source pin: drawer empty state uses the same copy.
    expect(src("../src/pages/pos/mobile-pos.tsx")).toContain(
      'description="No existing user"'
    );

    // UI pin: a hopeless drawer search renders the copy.
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/sales/new");
    await expect(page.locator('[data-testid="mobile-pos"]')).toBeVisible({
      timeout: 15000,
    });
    await page.getByText("Select or Add Customer").click();
    await page
      .locator('input[placeholder="Search name, phone or code..."]')
      .fill("zzz-no-such-client");
    await expect(page.getByText("No existing user")).toBeVisible();
  });

  test("customer payload contract: no gst/pan keys; shop GSTIN untouched", async () => {
    // Contract later tasks consume: customer payloads never carry
    // gst_number/pan keys. Ruling R2: shop GSTIN stays as-is.
    for (const rel of [
      "../src/pages/pos/mobile-pos.tsx",
      "../src/components/invoices/sale-form.tsx",
      "../src/pages/customers/mobile-customer-form.tsx",
      "../src/components/customers/customer-modal.tsx",
    ]) {
      expect(src(rel)).not.toMatch(/gst_number|pan_number/);
    }
    expect(src("../src/components/settings/shop-profile-settings.tsx")).toContain(
      "gst_number"
    );
    expect(src("../src/pages/onboarding/index.tsx")).toContain("gst_number");
  });
});
