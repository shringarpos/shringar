import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { MOCK_USER, MOCK_SHOP, MOCK_METAL_TYPES, MOCK_ORNAMENTS, MOCK_CATEGORIES, MOCK_PURITY_LEVELS, setupAuthenticatedContext } from "./fixtures/mock-auth";

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
    // Source pin: quick-add ships name/phone/address trims (phone non-null),
    // never gst_number/pan keys; trim-then-guard blocks whitespace-only input.
    const pos = src("../src/pages/pos/mobile-pos.tsx");
    expect(pos).not.toMatch(/gst_number|pan_number/);
    expect(pos).not.toMatch(/\bpan\s*:/);
    expect(pos).toMatch(
      /values:\s*\{\s*name:\s*quickClientName\.trim\(\),\s*phone:\s*quickClientPhone\.trim\(\),\s*address:\s*quickClientAddress\.trim\(\),/
    );
    expect(pos).toContain("Please enter client phone number");
    expect(pos).toContain('placeholder="Phone Number *"');

    // UI pin (390px renders MobilePOS): required Address + Phone inputs;
    // empty/whitespace-only saves are blocked client-side with zero POST
    // traffic; a complete save POSTs phone+address and never gst/pan keys
    // (mock route fulfills in-memory — no real records).
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
    const phoneInput = page.locator(
      '[data-testid="mobile-pos-quickadd-phone"]'
    );
    await expect(phoneInput).toBeVisible();
    expect((await phoneInput.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page
      .locator('input[placeholder="Client Name *"]')
      .fill("QA Address Pin");
    await page.getByRole("button", { name: /save & select client/i }).click();
    await page.waitForTimeout(800);
    expect(posts).toHaveLength(0);
    await expect(addressInput).toBeVisible();
    // Whitespace-only address slips past `required` without trim/whitespace
    // handling — must also block with zero POST.
    await addressInput.fill("   ");
    await page.getByRole("button", { name: /save & select client/i }).click();
    await page.waitForTimeout(800);
    expect(posts).toHaveLength(0);
    await addressInput.fill("14 Task Lane, Mumbai");
    // Address present but phone empty → still blocked, panel stays open.
    await page.getByRole("button", { name: /save & select client/i }).click();
    await page.waitForTimeout(800);
    expect(posts).toHaveLength(0);
    await expect(addressInput).toBeVisible();
    await phoneInput.fill("9876543210");
    await page.getByRole("button", { name: /save & select client/i }).click();
    await expect
      .poll(() => posts.length, { timeout: 10000 })
      .toBeGreaterThan(0);
    const payload = posts[posts.length - 1];
    expect(payload.address).toBe("14 Task Lane, Mumbai");
    expect(payload.phone).toBe("9876543210");
    expect(payload).not.toHaveProperty("gst_number");
    expect(payload).not.toHaveProperty("pan_number");
    expect(payload).not.toHaveProperty("pan");
  });

  test("mobile customer form has required address, no GSTIN/PAN inputs", async ({
    page,
  }) => {
    // Source pin: no non-schema keys; phone + address carry required rules
    // (whitespace: true so " " can't slip through); phone sent non-null.
    const form = src("../src/pages/customers/mobile-customer-form.tsx");
    expect(form).not.toMatch(/gst_number|pan_number/);
    expect(form).not.toMatch(/\bpan\s*:/);
    expect(form).not.toMatch(/\bnotes\s*:/);
    expect(form).toMatch(/name="address"[\s\S]{0,300}?required/);
    expect(form).toMatch(/name="phone"[\s\S]{0,400}?required/);
    expect(form).toContain("whitespace: true");
    expect(form).toContain("phone: values.phone.trim()");

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

  test("customer payload contract: no gst/pan/notes keys; shop GSTIN untouched", async () => {
    // Contract later tasks consume: customer payloads never carry
    // gst_number/pan_number keys, bare `pan:` keys, or customer-scoped
    // `notes:` keys. NOTE: `notes:` IS legitimate in invoice payloads
    // (sale-form invoice notes, mobile-pos "Paid via …"), so the notes pin
    // is file-wide only where no invoice builder exists, and scoped to the
    // quick-add values block in mobile-pos. Ruling R2: shop GSTIN stays.
    for (const rel of [
      "../src/pages/pos/mobile-pos.tsx",
      "../src/components/invoices/sale-form.tsx",
      "../src/pages/customers/mobile-customer-form.tsx",
      "../src/components/customers/customer-modal.tsx",
    ]) {
      expect(src(rel)).not.toMatch(/gst_number|pan_number/);
      expect(src(rel)).not.toMatch(/\bpan\s*:/);
    }
    for (const rel of [
      "../src/pages/customers/mobile-customer-form.tsx",
      "../src/components/customers/customer-modal.tsx",
    ]) {
      expect(src(rel)).not.toMatch(/\bnotes\s*:/);
    }
    expect(src("../src/pages/pos/mobile-pos.tsx")).toMatch(
      /values:\s*\{\s*name:\s*quickClientName\.trim\(\),\s*phone:\s*quickClientPhone\.trim\(\),\s*address:\s*quickClientAddress\.trim\(\),/
    );
    expect(src("../src/components/settings/shop-profile-settings.tsx")).toContain(
      "gst_number"
    );
    expect(src("../src/pages/onboarding/index.tsx")).toContain("gst_number");
  });
});

test.describe("Task 2: gold-loan created_by schema error", () => {
  // Exact writable columns per migration 20261005154854_add_gold_ledger_loans.sql
  // (no migration allowed — builders must map/strip to these): user_id,
  // customer_name, contact_no, address, nominee, metal_type, purity,
  // ornament_details, loan_date, closure_date, loan_amount, duration_months,
  // interest_rate, interest_amount, total_amount, status ('running'|'closed').
  const writers = [
    "../src/pages/gold-ledger/mobile-gold-loan-form.tsx",
    "../src/pages/gold-ledger/index.tsx",
    "../src/components/gold-ledger/mobile-gold-ledger.tsx",
  ];
  const forbiddenKeys = [
    "created_by",
    "shop_id",
    "updated_by",
    "customer_phone",
    "item_description",
    "interest_rate_pct",
  ];

  test("gold loan writers ship exact schema columns with user_id", async () => {
    // Every gold_loans payload builder sends user_id (RLS user_id = auth.uid())
    // and none of the non-schema / misnamed keys.
    for (const rel of writers) {
      const body = src(rel);
      expect(body).toContain("user_id:");
      for (const bad of forbiddenKeys)
        expect(body).not.toMatch(new RegExp(`\\b${bad}\\b`));
    }
    // Mobile form maps UI names to schema columns and derives amounts.
    const loanForm = src("../src/pages/gold-ledger/mobile-gold-loan-form.tsx");
    expect(loanForm).toMatch(/\bcontact_no\b/);
    expect(loanForm).toMatch(/\bornament_details\b/);
    expect(loanForm).toMatch(/interest_rate:\s*rate/);
    expect(loanForm).toMatch(/\binterest_amount\b/);
    expect(loanForm).toMatch(/\btotal_amount\b/);
    expect(loanForm).toMatch(/status:\s*"running"/);
    expect(loanForm).not.toMatch(/"active"/);
    // Desktop create route stays a pure wrapper with no payload keys at all.
    const createPage = src("../src/pages/gold-ledger/create.tsx");
    for (const key of [...forbiddenKeys, "user_id", "contact_no", "values:"])
      expect(createPage).not.toMatch(new RegExp(`\\b${key}\\b`));
  });

  test("gold loan form requires address, nominee and amounts on empty submit", async ({
    page,
  }) => {
    // UI pin (390px renders MobileGoldLoanForm): empty submit surfaces
    // required errors for every NOT NULL column collected on the form, with
    // zero POST traffic (mock route fulfills in-memory — no real records).
    const posts: any[] = [];
    page.on("request", (r) => {
      if (
        r.url().includes("/rest/v1/gold_loans") &&
        r.method() === "POST"
      )
        posts.push(r.postDataJSON());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/gold-ledger/new");
    await expect(
      page.locator('[data-testid="mobile-gold-loan-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: /create loan/i }).click();
    await expect(page.getByText("Borrower name is required")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Contact number is required")).toBeVisible();
    await expect(page.getByText("Nominee name is required")).toBeVisible();
    await expect(page.getByText("Residential address is required")).toBeVisible();
    await expect(page.getByText("Describe the ornaments")).toBeVisible();
    await expect(page.getByText("Enter principal amount")).toBeVisible();
    await page.waitForTimeout(800);
    expect(posts).toHaveLength(0);
  });

  test("gold loan submit posts exact schema payload with derived interest", async ({
    page,
  }) => {
    // Payload-shape pin: a complete submit POSTs EXACTLY the schema columns
    // (mock 201 fulfilled in-memory — no real writes). Derived amounts follow
    // the formula the UI badge displays: monthly = round(P * r% / 100),
    // interest = monthly * months, total = P + interest.
    const posts: any[] = [];
    page.on("request", (r) => {
      if (
        r.url().includes("/rest/v1/gold_loans") &&
        r.method() === "POST"
      )
        posts.push(r.postDataJSON());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/gold-ledger/new");
    await expect(
      page.locator('[data-testid="mobile-gold-loan-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    await page
      .locator('input[placeholder="Full name of borrower"]')
      .fill("Meera QA");
    await page
      .locator('input[placeholder="10-digit mobile number"]')
      .fill("9876543210");
    await page
      .locator('input[placeholder="Resident village / town"]')
      .fill("B-22 Silver Oak Heights, Mumbai");
    await page
      .locator('input[placeholder="Nominee full name"]')
      .fill("Rajesh QA");
    await page
      .locator('input[placeholder="e.g. 2 Gold Bangles (24.5g gross)"]')
      .fill("Gold Choker 58g 22K");
    await page.locator('input[placeholder="₹ Principal"]').fill("100000");
    await page.locator("#interest_rate").fill("2");
    await page.locator("#duration_months").fill("12");
    await page.getByRole("button", { name: /create loan/i }).click();
    await expect
      .poll(() => posts.length, { timeout: 10000 })
      .toBeGreaterThan(0);
    const payload = posts[posts.length - 1];
    expect(Object.keys(payload).sort()).toEqual(
      [
        "address",
        "contact_no",
        "customer_name",
        "duration_months",
        "interest_amount",
        "interest_rate",
        "loan_amount",
        "loan_date",
        "metal_type",
        "nominee",
        "ornament_details",
        "purity",
        "status",
        "total_amount",
        "user_id",
      ].sort()
    );
    expect(payload.user_id).toBe(MOCK_USER.id);
    expect(payload.customer_name).toBe("Meera QA");
    expect(payload.contact_no).toBe("9876543210");
    expect(payload.nominee).toBe("Rajesh QA");
    expect(payload.status).toBe("running");
    expect(payload.loan_amount).toBe(100000);
    expect(payload.interest_rate).toBe(2);
    expect(payload.duration_months).toBe(12);
    // 100000 @ 2%/mo x 12mo → monthly 2000, interest 24000, total 124000.
    expect(payload.interest_amount).toBe(24000);
    expect(payload.total_amount).toBe(124000);
    expect(payload.loan_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

test.describe("Task 3: new-sale empty state + gold/silver-only scope", () => {
  // A legacy DIAMOND metal row injected on top of the shared mock (which is
  // gold/silver-only). Ruling R3 (binding): diamond UI *options* go away, but
  // existing diamond records keep rendering with their badges.
  const DIAMOND_METAL = {
    id: "00000000-0000-0000-0000-000000000003",
    name: "DIAMOND",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
  const METALS_WITH_DIAMOND = [...MOCK_METAL_TYPES, DIAMOND_METAL];

  // Registers AFTER setupAuthenticatedContext, so these handlers win for GET
  // (Playwright matches most-recently-registered first); other methods fall
  // through to the fixture handlers. No writes ever reach a real backend.
  async function setupWithDiamond(page: any) {
    await setupAuthenticatedContext(page);
    await page.route("**/rest/v1/metal_types*", async (route: any) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-2/3" },
        body: JSON.stringify(METALS_WITH_DIAMOND),
      });
    });
    await page.route("**/rest/v1/ornaments*", async (route: any) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }
      const shape = (o: any) => ({
        ...o,
        category: MOCK_CATEGORIES.find((c) => c.id === o.category_id) || {
          id: o.category_id,
          name: "Jewellery",
        },
        metal_type: METALS_WITH_DIAMOND.find((m) => m.id === o.metal_type_id) || {
          id: o.metal_type_id,
          name: "GOLD",
        },
        purity_level: MOCK_PURITY_LEVELS.find((p) => p.id === o.purity_level_id) || {
          id: o.purity_level_id,
          display_name: "22K",
          purity_value: 92,
        },
      });
      const legacyDiamondPiece = {
        id: "orn-diamond-legacy",
        shop_id: MOCK_SHOP.id,
        category_id: "cat-2",
        metal_type_id: DIAMOND_METAL.id,
        purity_level_id: "purity-g-18k",
        name: "Legacy Diamond Pendant",
        weight_mg: 8200,
        quantity: 1,
        purchase_metal_rate_paise: 560000,
        purchase_making_charge_paise: 15000,
        purchase_total_cost_paise: 4742000,
        purchase_date: "2026-09-20",
        sku: "DM-LEG-009",
        description: "Legacy diamond piece",
        is_active: true,
        created_at: "2026-09-20T14:00:00Z",
        updated_at: "2026-09-20T14:00:00Z",
      };
      const rows = [...MOCK_ORNAMENTS.map(shape), shape(legacyDiamondPiece)];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": `0-${rows.length - 1}/${rows.length}` },
        body: JSON.stringify(rows),
      });
    });
  }

  test("390px: empty ornament search shows Add-piece CTA to /ornaments/new", async ({
    page,
  }) => {
    // Source pins: CTA navigates to the mobile dedicated form; 44px target.
    const pos = src("../src/pages/pos/mobile-pos.tsx");
    expect(pos).toContain('navigate("/ornaments/new")');
    expect(pos).toMatch(/add piece/i);
    expect(pos).toMatch(/minHeight:\s*44/);

    // UI pin (390px renders MobilePOS): a hopeless search yields zero pieces
    // and a visible Add-piece CTA; tapping it lands on /ornaments/new with
    // zero POST traffic (add-piece flow smoke, no writes — Task 1 customer
    // payload contract untouched: no customer POSTs in this flow).
    const posts: any[] = [];
    page.on("request", (r) => {
      if (
        (r.url().includes("/rest/v1/ornaments") ||
          r.url().includes("/rest/v1/customers")) &&
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
    await expect(page.getByText("Royal Kundan Choker")).toBeVisible({
      timeout: 10000,
    });
    await page
      .locator('input[placeholder="Search items or scan barcode..."]')
      .fill("zzz-no-such-piece");
    await expect(page.getByText("No ornaments found")).toBeVisible();
    const cta = page.getByRole("button", { name: /add piece/i });
    await expect(cta).toBeVisible();
    expect((await cta.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await cta.click();
    await expect(page).toHaveURL(/\/ornaments\/new/);
    await expect(
      page.locator('[data-testid="mobile-ornament-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    expect(posts).toHaveLength(0);
  });

  test("no diamond filter option on POS + inventory; legacy piece keeps badge", async ({
    page,
  }) => {
    // Source pins: POS pills are exactly all/gold/silver; grid keeps the
    // diamond badge branch (R3) but drops the diamond filter key.
    const pos = src("../src/pages/pos/mobile-pos.tsx");
    expect(pos).toMatch(/\["all",\s*"gold",\s*"silver"\]/);
    expect(pos).not.toMatch(/diamond/i);
    const grid = src("../src/components/inventory/mobile-ornament-grid.tsx");
    expect(grid).not.toMatch(/key:\s*"diamond"/);
    expect(grid).toContain('name: "Diamond"');
    // Desktop ornaments index + desktop sale form carry no diamond option
    // lists (DB-driven metal selects) — verified by grep, no change needed.
    for (const rel of [
      "../src/pages/inventory/ornaments/index.tsx",
      "../src/components/invoices/sale-form.tsx",
    ]) {
      expect(src(rel)).not.toMatch(/diamond/i);
    }

    // UI pins (even with DIAMOND in metal_types, no diamond pill is offered).
    await page.setViewportSize({ width: 390, height: 844 });
    await setupWithDiamond(page);
    await page.goto("/sales/new");
    await expect(page.locator('[data-testid="mobile-pos"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Royal Kundan Choker")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: /^diamond$/i })
    ).toHaveCount(0);
    await page.goto("/ornaments");
    await expect(page.locator('[data-testid="mobile-ornaments"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: /^diamond$/i })
    ).toHaveCount(0);
    // R3: the legacy diamond record still renders, with its badge (badge shows
    // the raw metal_types name, which is uppercase in seed data).
    await expect(page.getByText("Legacy Diamond Pendant")).toBeVisible();
    await expect(page.getByText(/diamond • 18k/i)).toBeVisible();
  });

  test("ornament create forms offer gold/silver only", async ({ page }) => {
    // Source pins: both create forms scope metal options to gold/silver and
    // carry no diamond option entries.
    for (const rel of [
      "../src/pages/inventory/ornaments/mobile-ornament-form.tsx",
      "../src/components/inventory/ornaments/ornament-drawer.tsx",
    ]) {
      expect(src(rel)).toMatch(/gold\|silver/i);
      expect(src(rel)).not.toMatch(/diamond/i);
    }

    // UI pin (mobile dedicated form, DIAMOND present in metal_types).
    await page.setViewportSize({ width: 390, height: 844 });
    await setupWithDiamond(page);
    await page.goto("/ornaments/new");
    await expect(
      page.locator('[data-testid="mobile-ornament-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /^gold$/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /^silver$/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^diamond$/i })
    ).toHaveCount(0);

    // UI pin (desktop drawer Metal Type select, same diamond-present data).
    // NOTE: create/edit/clone drawers all mount hidden with the same
    // #metal_type_id, so scope to the open drawer only.
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/ornaments");
    await page.getByRole("button", { name: /new ornament/i }).click();
    await page.locator(".ant-drawer-open #metal_type_id").click();
    // NOTE: hidden drawers render their own (hidden) dropdown copies, so scope
    // option pins to the open dropdown only. Options render with zero width in
    // this harness (attached, not visible), so pin attachment — gold/silver
    // attaching first proves the async options loaded, making the diamond
    // zero-count non-vacuous.
    const openOpts = page.locator(
      ".ant-select-dropdown:not(.ant-select-dropdown-hidden)"
    );
    await expect(
      openOpts.getByRole("option", { name: /^gold$/i })
    ).toBeAttached({ timeout: 10000 });
    await expect(
      openOpts.getByRole("option", { name: /^silver$/i })
    ).toBeAttached();
    await expect(openOpts.getByRole("option", { name: /diamond/i })).toHaveCount(
      0
    );
  });
});
