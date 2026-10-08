import { test, expect } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

const LIST_ROUTES = [
  "/",
  "/customers",
  "/ornaments",
  "/invoices",
  "/gold-ledger",
  "/metal-rates",
  "/design-gallery",
  "/settings",
];

test.describe("Console-error contract (F4: shops.shop_id 400s)", () => {
  test("no shops.shop_id 400s on list pages", async ({ page }) => {
    await setupAuthenticatedContext(page);
    const bad: string[] = [];
    page.on("response", (r) => {
      if (r.status() === 400) bad.push(r.url());
    });
    for (const route of LIST_ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(800);
    }
    expect(bad).toEqual([]);
  });

  test("shops resource is never filtered by non-existent shop_id column", async ({
    page,
  }) => {
    await setupAuthenticatedContext(page);
    const badRequests: string[] = [];
    const shopsRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (/\/rest\/v1\/shops/.test(url)) {
        shopsRequests.push(url);
        if (/shop_id=/.test(url)) badRequests.push(url);
      }
    });
    for (const route of LIST_ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(800);
    }
    // The shell must actually query shops (guard against vacuous pass).
    expect(shopsRequests.length).toBeGreaterThan(0);
    expect(badRequests).toEqual([]);
  });
});
