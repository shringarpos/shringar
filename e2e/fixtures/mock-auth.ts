import { Page } from "@playwright/test";

export const MOCK_USER = {
  id: "test-user-id-0000-0000-0000-000000000000",
  aud: "authenticated",
  role: "authenticated",
  email: "designer@shringar.test",
  phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Lead UX Designer" },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export const MOCK_SHOP = {
  id: "test-shop-id-0000-0000-0000-000000000000",
  user_id: MOCK_USER.id,
  name: "Shringar Fine Jewels",
  code: "SFJ01",
  address: "MG Road, Suite 402",
  phone: "+91 98765 43210",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const MOCK_SESSION = {
  access_token: "mock-jwt-token-for-e2e-testing-playwright",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: MOCK_USER,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

/**
 * Injects authenticated session and mocks Supabase REST queries so E2E tests
 * can run deterministically in any environment.
 */
export async function setupAuthenticatedContext(page: Page, initialLoans = []) {
  // Mock Supabase Auth API
  await page.route("**/auth/v1/user*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    });
  });

  await page.route("**/auth/v1/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    });
  });

  // Mock Shop verification for OnboardingGuard
  await page.route("**/rest/v1/shops*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-range": "0-0/1",
      },
      body: JSON.stringify([MOCK_SHOP]),
    });
  });

  // Mock Gold Loans PostgREST endpoint
  let currentLoans = [...initialLoans];

  await page.route("**/rest/v1/gold_loans*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "content-range": `0-${Math.max(0, currentLoans.length - 1)}/${currentLoans.length}`,
        },
        body: JSON.stringify(currentLoans),
      });
    } else if (method === "POST") {
      const postData = route.request().postDataJSON();
      const newRecord = {
        ...postData,
        id: `loan-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      currentLoans.push(newRecord);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([newRecord]),
      });
    } else if (method === "PATCH") {
      const patchData = route.request().postDataJSON();
      currentLoans = currentLoans.map((l) => ({ ...l, ...patchData }));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(currentLoans),
      });
    } else if (method === "DELETE") {
      await route.fulfill({
        status: 204,
      });
    } else {
      await route.continue();
    }
  });

  // Seed localStorage before page loads
  await page.addInitScript(
    ({ session }) => {
      const storageKey = "sb-yxixgwbdevpurnahckid-auth-token";
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      // Default to light mode for standard tests; theme test will toggle
      if (!window.localStorage.getItem("colorMode")) {
        window.localStorage.setItem("colorMode", "light");
      }
    },
    { session: MOCK_SESSION }
  );
}
