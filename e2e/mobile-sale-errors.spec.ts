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

test.describe("Task 4: inventory form centered stock + desktop SKU parity", () => {
  const mobileFormRel = "../src/pages/inventory/ornaments/mobile-ornament-form.tsx";
  const desktopDrawerRel =
    "../src/components/inventory/ornaments/ornament-drawer.tsx";

  test("stock quantity input text is centered with even padding", async ({
    page,
  }) => {
    // Source pin: centering lives in a scoped rule on the inner input
    // (.ant-input-number-input) — a wrapper-level textAlign never reaches it,
    // which is the reported bug.
    const form = src(mobileFormRel);
    expect(form).toContain("mobile-stock-input");
    expect(form).toContain("mobile-stock-centered");
    expect(form).toMatch(
      /\.mobile-stock-centered \.ant-input-number-input\s*\{\s*text-align:\s*center;\s*padding:\s*0 8px;/
    );

    // UI pin: computed text-align of the inner input is center with symmetric
    // horizontal padding (mock-auth; no writes anywhere in this flow).
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/ornaments/new");
    await expect(
      page.locator('[data-testid="mobile-ornament-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    const inner = page.locator('[data-testid="mobile-stock-input"] input');
    await expect(inner).toBeVisible();
    const style = await inner.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        textAlign: cs.textAlign,
        pl: cs.paddingLeft,
        pr: cs.paddingRight,
      };
    });
    expect(style.textAlign).toBe("center");
    expect(style.pl).toBe(style.pr);
  });

  test("mobile SKU auto-value matches desktop for same name; manual edit sticks", async ({
    page,
  }) => {
    // Source pins: generateSku chain ported verbatim from the desktop drawer
    // (READ-ONLY origin — asserted present, never edited here), manual-edit
    // stop flag, desktop help copy, and 500ms debounce parity.
    const mobile = src(mobileFormRel);
    expect(mobile).toContain("const generateSku = (name: string): string => {");
    expect(mobile).toMatch(/split\(\/\\s\+\/\)/);
    expect(mobile).toMatch(
      /\.slice\(0,\s*3\)\.toUpperCase\(\)\.replace\(\/\[\^A-Z0-9\]\/g,\s*""\)/
    );
    expect(mobile).toContain("skuManuallyEdited");
    expect(mobile).toContain("Auto-generated from name. Edit to customise.");
    expect(mobile).toContain(
      'setTimeout(() => setDebouncedSku(skuValue ?? ""), 500)'
    );
    expect(src(desktopDrawerRel)).toContain(
      "const generateSku = (name: string): string => {"
    );

    // UI pins, zero saves: no ornament POST may fire (mock fulfills in-memory).
    const posts: any[] = [];
    page.on("request", (r) => {
      if (
        r.url().includes("/rest/v1/ornaments") &&
        r.method() === "POST"
      )
        posts.push(r.postDataJSON());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/ornaments/new");
    await expect(
      page.locator('[data-testid="mobile-ornament-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    await page
      .locator('input[placeholder="e.g. Traditional Antique Kundan Bridal Set"]')
      .fill("Kundan Necklace");
    const mobileSku = page.locator("#sku");
    await expect
      .poll(() => mobileSku.inputValue(), { timeout: 10000 })
      .toBe("KUN-NEC");
    // Manual edit wins: later name changes must not overwrite the SKU.
    await mobileSku.fill("CUSTOM-1");
    await page
      .locator('input[placeholder="e.g. Traditional Antique Kundan Bridal Set"]')
      .fill("Kundan Necklace Deluxe");
    await page.waitForTimeout(600);
    await expect(mobileSku).toHaveValue("CUSTOM-1");

    // Desktop drawer parity: the same name yields the same auto SKU.
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/ornaments");
    await page.getByRole("button", { name: /new ornament/i }).click();
    const drawer = page.locator(".ant-drawer-open");
    await expect(drawer).toBeVisible({ timeout: 10000 });
    await drawer
      .locator('input[placeholder="e.g. Kundan Necklace"]')
      .fill("Kundan Necklace");
    const drawerSku = drawer.locator('input[placeholder="e.g. GLD-001"]');
    await expect
      .poll(() => drawerSku.inputValue(), { timeout: 10000 })
      .toBe("KUN-NEC");
    expect(posts).toHaveLength(0);
  });
});

test.describe("Task 5: mobile native polish + parity", () => {
  test("(a) rate drawer inputs sit directly on card bg, token borders only", async ({
    page,
  }) => {
    // Source pin: no third-color faded input bg; drawer + inputs share the
    // card token with token-only borders.
    const bar = src("../src/components/metal-rates/mobile-metal-rates-bar.tsx");
    expect(bar).not.toMatch(/#1a1a1e/);
    expect(bar).toContain("colorBgContainer");
    expect(bar).toMatch(/border:\s*`?1px solid \$\{token\.colorBorder\}/);

    // UI pin (390px): drawer input computed bg == drawer card bg.
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/sales/new");
    await expect(page.locator('[data-testid="mobile-pos"]')).toBeVisible({
      timeout: 15000,
    });
    await page.locator('[data-testid="mobile-metal-rates-bar"]').click();
    const drawer = page.locator(".ant-drawer-open");
    await expect(drawer).toBeVisible({ timeout: 10000 });
    const bgs = await drawer.evaluate((root) => {
      const body = root.querySelector(".ant-drawer-body") as HTMLElement;
      const input = root.querySelector(".ant-input-number") as HTMLElement;
      const cs = (el: HTMLElement | null) =>
        el ? getComputedStyle(el).backgroundColor : null;
      return { body: cs(body), input: cs(input) };
    });
    expect(bgs.input).not.toBeNull();
    expect(bgs.input).toBe(bgs.body);
  });

  test("(b) categories render compact native rows on mobile, grid untouched on desktop", async ({
    page,
  }) => {
    // Source pins: mobile rows carry thumbnail (56-64px), name+count and a
    // chevron; desktop grid branch stays intact behind the breakpoint.
    const cats = src("../src/pages/inventory/categories/index.tsx");
    expect(cats).toContain("mobile-category-row");
    expect(cats).toContain("mobile-category-thumb");
    expect(cats).toContain("mobile-category-toggle");
    expect(cats).toMatch(/ChevronRight|RightOutlined/);
    // 60px thumbnail sits inside the 56-64px native spec (UI asserts the box).
    expect(cats).toContain("width: 60");
    expect(cats).toMatch(/piece/);
    expect(cats).toContain("grid={{");

    // UI pin (390px): compact rows with 56-64px thumbs, name+count, chevron.
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/categories");
    const row = page.locator('[data-testid="mobile-category-row"]').first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="mobile-category-row"]')
    ).toHaveCount(4);
    const thumb = row.locator('[data-testid="mobile-category-thumb"]');
    const box = await thumb.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
    expect(box?.height ?? 0).toBeLessThanOrEqual(64);
    await expect(
      row.locator('[data-testid="mobile-category-chevron"]')
    ).toBeVisible();
    // Strict 44px gate: default-size Switch lives in a 44x44 tappable well.
    const toggleWell = row.locator('[data-testid="mobile-category-toggle"]');
    await expect(toggleWell).toBeVisible();
    const toggleBox = await toggleWell.boundingBox();
    expect(toggleBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(toggleBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    // cat-1 carries exactly the orn-1 mock piece.
    await expect(
      page.locator('[data-testid="mobile-category-row"]').filter({ hasText: "Necklaces" })
    ).toContainText("1 piece");

    // UI pin (desktop): big-box grid stays, compact rows absent.
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/categories");
    await expect(page.getByText("Necklaces").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('[data-testid="mobile-category-row"]')
    ).toHaveCount(0);
  });

  test("(c) rate-trend filters collapse to a single compact scroll row on mobile", async ({
    page,
  }) => {
    // Source pin: one scrollable filter row on mobile (range + metal together).
    const chart = src("../src/components/metal-rates/rate-chart.tsx");
    expect(chart).toContain("rate-trend-filters");
    expect(chart).toMatch(/overflowX:\s*"auto"/);

    // UI pin (390px): range + metal options share one row in a scroller.
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/metal-rates");
    const filters = page.locator('[data-testid="rate-trend-filters"]');
    await expect(filters).toBeVisible({ timeout: 15000 });
    const overflowX = await filters.evaluate(
      (el) => getComputedStyle(el).overflowX
    );
    expect(["auto", "scroll"]).toContain(overflowX);
    const ys = await filters.evaluate((root) => {
      const btns = Array.from(
        root.querySelectorAll(".ant-radio-button-wrapper")
      ) as HTMLElement[];
      return btns.slice(0, 6).map((b) => b.getBoundingClientRect().top);
    });
    expect(ys.length).toBeGreaterThan(3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(10);

    // UI pin (desktop): stacked rows stay, single-row container absent.
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(filters).toHaveCount(0);
  });

  test("(d) making charges use native list/stepper rows with 44px targets on mobile", async ({
    page,
  }) => {
    // Source pins: native rows + stepper testids with 44px targets.
    const mc = src("../src/components/settings/making-charges-settings.tsx");
    expect(mc).toContain("mobile-making-row");
    expect(mc).toContain("mobile-making-inc");
    expect(mc).toContain("mobile-making-dec");
    expect(mc).toMatch(/44/);
    expect(mc).toContain("mobile-making-uniform-row");
    expect(mc).toContain("Uniform rate applies to all purities");

    // UI pin (390px /settings making tab): rows visible, steppers >= 44px,
    // and + steps the displayed charge by Rs 10.
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/settings");
    const row = page.locator('[data-testid="mobile-making-row"]').first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const inc = row.locator('[data-testid="mobile-making-inc"]');
    const dec = row.locator('[data-testid="mobile-making-dec"]');
    for (const btn of [inc, dec]) {
      const box = await btn.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    const value = row.locator('[data-testid="mobile-making-value"]');
    const before = await value.innerText();
    await inc.click();
    await expect
      .poll(() => value.innerText(), { timeout: 5000 })
      .not.toBe(before);

    // Uniform mode (SILVER card): exactly ONE stepper row owning the shared
    // value + explainer, no N mirroring rows.
    await expect(
      page.locator('[data-testid="mobile-making-uniform-row"]')
    ).toHaveCount(1);
    const uniform = page.locator('[data-testid="mobile-making-uniform-row"]');
    await expect(uniform).toBeVisible();
    await expect(
      page.locator('[data-testid="mobile-making-uniform-note"]')
    ).toContainText("Uniform rate applies to all purities");
    const uval = uniform.locator('[data-testid="mobile-making-value"]');
    const ubefore = await uval.innerText();
    await uniform.locator('[data-testid="mobile-making-inc"]').click();
    await expect
      .poll(() => uval.innerText(), { timeout: 5000 })
      .not.toBe(ubefore);
  });

  test("(e) parity source pins: sale/ornament/loan mobile forms carry every desktop field", async () => {
    // Mobile sale: invoice date + notes + making-charge inclusion.
    const pos = src("../src/pages/pos/mobile-pos.tsx");
    expect(pos).toContain("mobile-pos-include-making");
    expect(pos).toContain("mobile-pos-notes");
    expect(pos).toContain("mobile-pos-invoice-date");
    expect(pos).toContain("includeMaking");
    // Mobile ornament: read-only auto total-cost field like the desktop drawer.
    const form = src(
      "../src/pages/inventory/ornaments/mobile-ornament-form.tsx"
    );
    expect(form).toContain('name="purchase_total_cost_rs"');
    expect(form).toMatch(/readOnly/);
    expect(src("../src/components/inventory/ornaments/ornament-drawer.tsx")).toContain(
      'name="purchase_total_cost_rs"'
    );
    // Loan: desktop create renders the shared mobile form (parity by construction).
    expect(src("../src/pages/gold-ledger/create.tsx")).toContain(
      "MobileGoldLoanForm"
    );
  });

  test("(e) making-charge toggle changes mobile totals per the desktop formula", async ({
    page,
  }) => {
    // Desktop formula: line = metal + making; grand = metal + making - discount
    // (mobile additionally carries its pre-existing 3% GST row — asserted here
    // so the toggle delta stays exact under it).
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/sales/new");
    await expect(page.locator('[data-testid="mobile-pos"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Royal Kundan Choker")).toBeVisible({
      timeout: 10000,
    });
    await page.locator('[data-testid="mobile-pos-add-item"]').first().click();
    await page.getByRole("button", { name: /review & pay/i }).click();
    const drawer = page.locator(".ant-drawer-open");
    await expect(drawer).toBeVisible({ timeout: 10000 });
    const num = (testId: string) =>
      drawer.locator(`[data-testid="${testId}"]`).getAttribute("data-value");
    const subOn = Number(await num("mobile-pos-subtotal"));
    const making = Number(await num("mobile-pos-making-total"));
    const grandOn = Number(await num("mobile-pos-grand-total"));
    // orn-1 x1: making = its purchase_making_charge_paise (Rs 450); metal is
    // whatever weight x live rate yields — the pin asserts formula structure.
    expect(making).toBe(45000);
    const metal = subOn - making;
    expect(metal).toBeGreaterThan(0);
    expect(grandOn).toBe(subOn + Math.round(subOn * 0.03));
    // Toggle making off: totals drop by exactly making + its GST share.
    await drawer.locator('[data-testid="mobile-pos-include-making"]').click();
    const subOff = Number(await num("mobile-pos-subtotal"));
    const grandOff = Number(await num("mobile-pos-grand-total"));
    expect(subOff).toBe(subOn - making);
    expect(grandOff).toBe(subOff + Math.round(subOff * 0.03));
    expect(grandOn - grandOff).toBe(
      making + Math.round(subOn * 0.03) - Math.round(subOff * 0.03)
    );
  });

  test("(e) mobile sale posts desktop-identical payload incl. notes/date/making", async ({
    page,
  }) => {
    // Full parity payload: notes + invoice_date + desktop column set with
    // making included (mock fulfills in-memory — no real records).
    const invoices: any[] = [];
    const items: any[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/rest/v1/invoices") && r.method() === "POST")
        invoices.push(r.postDataJSON());
      if (r.url().includes("/rest/v1/invoice_items") && r.method() === "POST")
        items.push(r.postDataJSON());
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
    await page.locator('[data-testid="mobile-pos-add-item"]').first().click();
    await page.getByRole("button", { name: /review & pay/i }).click();
    const drawer = page.locator(".ant-drawer-open");
    await expect(drawer).toBeVisible({ timeout: 10000 });
    await expect(
      drawer.locator('[data-testid="mobile-pos-invoice-date"]')
    ).toBeVisible();
    await drawer.locator('[data-testid="mobile-pos-notes"]').fill("Resize note");
    await drawer
      .getByRole("button", { name: /confirm & generate bill/i })
      .click();
    await expect.poll(() => invoices.length, { timeout: 15000 }).toBeGreaterThan(0);
    const inv = invoices[invoices.length - 1];
    const today = new Date().toISOString().slice(0, 10);
    expect(inv.invoice_date).toBe(today);
    expect(inv.notes).toBe("Resize note");
    expect(inv.total_making_charges_paise).toBe(45000);
    expect(inv.discount_amount_paise).toBe(0);
    expect(inv.total_amount_paise).toBe(
      inv.subtotal_amount_paise +
        Math.round(inv.subtotal_amount_paise * 0.03) -
        inv.discount_amount_paise
    );
    await expect.poll(() => items.length, { timeout: 15000 }).toBeGreaterThan(0);
    const li = items[items.length - 1];
    expect(li.making_charge_amount_paise).toBe(45000);
    expect(li.line_total_paise).toBe(
      li.metal_amount_paise + li.making_charge_amount_paise
    );
  });

  test("(e) making toggle off posts zero making with Paid-via fallback notes", async ({
    page,
  }) => {
    // Excluded making posts zeros (desktop formula with making = 0) while the
    // untouched-notes fallback keeps the pre-existing Paid-via behavior.
    const invoices: any[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/rest/v1/invoices") && r.method() === "POST")
        invoices.push(r.postDataJSON());
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
    await page.locator('[data-testid="mobile-pos-add-item"]').first().click();
    await page.getByRole("button", { name: /review & pay/i }).click();
    const drawer = page.locator(".ant-drawer-open");
    await expect(drawer).toBeVisible({ timeout: 10000 });
    await drawer.locator('[data-testid="mobile-pos-include-making"]').click();
    await drawer
      .getByRole("button", { name: /confirm & generate bill/i })
      .click();
    await expect.poll(() => invoices.length, { timeout: 15000 }).toBeGreaterThan(0);
    const inv = invoices[invoices.length - 1];
    expect(inv.total_making_charges_paise).toBe(0);
    expect(inv.notes).toBe("Paid via CASH");
    expect(inv.total_amount_paise).toBe(
      inv.subtotal_amount_paise +
        Math.round(inv.subtotal_amount_paise * 0.03) -
        inv.discount_amount_paise
    );
  });

  test("(e) mobile ornament total-cost field auto-matches desktop formula", async ({
    page,
  }) => {
    // Desktop drawer: Total Purchase Cost (Rs, readOnly) = (weight x rate) + making.
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/ornaments/new");
    await expect(
      page.locator('[data-testid="mobile-ornament-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    await page
      .locator('input[placeholder="e.g. 14.850"]')
      .fill("10");
    await page.locator('input[placeholder="e.g. 7200"]').fill("7000");
    await page.locator('input[placeholder="e.g. 3500"]').fill("500");
    // data-testid lands on the inner input itself; value auto-syncs.
    const total = page.locator('[data-testid="mobile-total-cost-input"]');
    await expect(total).toBeVisible();
    await expect
      .poll(() => total.inputValue(), { timeout: 10000 })
      .toBe("70500");
  });

  test("(e) loan form is shared: identical fields on mobile + desktop widths", async ({
    page,
  }) => {
    // Desktop create.tsx renders MobileGoldLoanForm — parity by construction.
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await page.goto("/gold-ledger/new");
    await expect(
      page.locator('[data-testid="mobile-gold-loan-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[placeholder="₹ Principal"]')).toBeVisible();
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/gold-ledger/new");
    await expect(
      page.locator('[data-testid="mobile-gold-loan-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[placeholder="₹ Principal"]')).toBeVisible();
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

test.describe("Task 6: field-specific empty states + mobile toasts", () => {
  // Every empty state names its field; mobile toasts are small + bottom-docked
  // above the tab bar with a shorter duration. Harness note (probed 2026-10-08):
  // antd static message.* toasts never attach to the DOM in this Playwright
  // setup (no `.ant-message` holder 1.2s after firing), so toast pins assert
  // the variant config in source/CSS + call-site usage, while the UI half pins
  // the validation-toast path behaviorally (empty submit blocked, zero POST).
  // All traffic is mock-auth fulfilled in-memory — no real records anywhere.

  // Registers AFTER setupAuthenticatedContext, so this handler wins for GET
  // (Playwright matches most-recently-registered first); other methods fall
  // through to the fixture handlers.
  async function setupEmptyResource(page: any, pattern: string) {
    await page.route(pattern, async (route: any) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "*/0" },
        body: "[]",
      });
    });
  }

  test("desktop tables + category lists name their field (source)", async () => {
    // Generic antd "No Data" fallbacks become field-specific locale text.
    expect(src("../src/pages/inventory/categories/index.tsx")).toContain(
      "No categories yet"
    );
    expect(src("../src/pages/inventory/ornaments/index.tsx")).toContain(
      "No ornaments yet"
    );
    expect(src("../src/pages/customers/index.tsx")).toContain(
      "No customers yet"
    );
    expect(src("../src/pages/invoices/index.tsx")).toContain("No invoices yet");
    expect(src("../src/pages/gold-ledger/index.tsx")).toContain("No loans yet");
    expect(src("../src/pages/gold-ledger/reports.tsx")).toContain(
      "No loans found"
    );
    for (const rel of [
      "../src/pages/inventory/categories/index.tsx",
      "../src/pages/inventory/ornaments/index.tsx",
      "../src/pages/customers/index.tsx",
      "../src/pages/invoices/index.tsx",
      "../src/pages/gold-ledger/index.tsx",
      "../src/pages/gold-ledger/reports.tsx",
    ]) {
      expect(src(rel)).toMatch(/emptyText/);
    }
  });

  test("mobile empty states name field + CTA to create routes (source)", async () => {
    // Copy pins.
    expect(
      src("../src/components/inventory/mobile-ornament-grid.tsx")
    ).toContain("No ornaments found");
    expect(
      src("../src/components/invoices/mobile-invoice-list.tsx")
    ).toContain("No invoices found");
    expect(
      src("../src/components/customers/mobile-customer-list.tsx")
    ).toContain("No clients found");
    expect(src("../src/components/gold-ledger/mobile-gold-ledger.tsx")).toContain(
      "No loans found"
    );
    // CTA pins: each empty state reuses its list's create-route target
    // (Task 3 /ornaments/new pattern).
    expect(
      src("../src/components/inventory/mobile-ornament-grid.tsx")
    ).toContain('data-testid="mobile-empty-add-ornament"');
    expect(
      src("../src/components/invoices/mobile-invoice-list.tsx")
    ).toContain('data-testid="mobile-empty-new-sale"');
    expect(
      src("../src/components/customers/mobile-customer-list.tsx")
    ).toContain('data-testid="mobile-empty-add-client"');
    expect(src("../src/components/gold-ledger/mobile-gold-ledger.tsx")).toContain(
      'data-testid="mobile-empty-new-loan"'
    );
  });

  test("notifyMobile variant: small + bottom-docked + short; mobile call sites use it", async () => {
    // Variant config pins: shorter than antd's default 3s duration, small
    // copy, bottom-docked above the tab bar.
    const helper = src("../src/utils/mobile-notify.ts");
    expect(helper).toContain("notifyMobile");
    expect(helper).toMatch(/MOBILE_TOAST_DURATION\s*=\s*2/);
    expect(helper).toContain("mobile-toast");
    expect(helper).toMatch(/MOBILE_TOAST_BOTTOM_OFFSET\s*=\s*84/);
    expect(helper).toMatch(/fontSize:\s*12/);
    const css = src("../src/index.css");
    expect(css).toContain(".mobile-toast");
    expect(css).toMatch(/bottom:\s*84px/);
    // Applied at mobile call sites: all four mobile message.* users go through
    // the helper; no bare antd message toast calls remain in them.
    for (const rel of [
      "../src/pages/pos/mobile-pos.tsx",
      "../src/components/gold-ledger/mobile-gold-ledger.tsx",
      "../src/components/invoices/mobile-invoice-list.tsx",
      "../src/components/metal-rates/mobile-metal-rates-bar.tsx",
    ]) {
      const body = src(rel);
      expect(body).toContain("notifyMobile");
      expect(body).toMatch(/utils\/mobile-notify/);
      expect(body).not.toMatch(/message\.(error|success|warning|info)/);
    }
    // Desktop behavior unchanged: desktop surfaces never import the helper.
    for (const rel of [
      "../src/components/invoices/sale-form.tsx",
      "../src/components/inventory/ornaments/ornament-drawer.tsx",
      "../src/pages/gold-ledger/index.tsx",
    ]) {
      expect(src(rel)).not.toContain("notifyMobile");
    }
  });

  test("390px: empty ornaments grid shows copy + Add-ornament CTA to /ornaments/new", async ({
    page,
  }) => {
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
    await setupEmptyResource(page, "**/rest/v1/ornaments*");
    await page.goto("/ornaments");
    await expect(page.locator('[data-testid="mobile-ornaments"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("No ornaments found")).toBeVisible();
    const cta = page.locator('[data-testid="mobile-empty-add-ornament"]');
    await expect(cta).toBeVisible();
    expect((await cta.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await cta.click();
    await expect(page).toHaveURL(/\/ornaments\/new/);
    await expect(
      page.locator('[data-testid="mobile-ornament-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    expect(posts).toHaveLength(0);
  });

  test("390px: empty invoices list shows copy + New-sale CTA to /sales/new", async ({
    page,
  }) => {
    const posts: any[] = [];
    page.on("request", (r) => {
      if (
        r.url().includes("/rest/v1/invoices") &&
        r.method() === "POST"
      )
        posts.push(r.postDataJSON());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await setupEmptyResource(page, "**/rest/v1/invoices*");
    await page.goto("/invoices");
    await expect(page.locator('[data-testid="mobile-invoices"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("No invoices found")).toBeVisible();
    const cta = page.locator('[data-testid="mobile-empty-new-sale"]');
    await expect(cta).toBeVisible();
    expect((await cta.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await cta.click();
    await expect(page).toHaveURL(/\/sales\/new/);
    await expect(page.locator('[data-testid="mobile-pos"]')).toBeVisible({
      timeout: 15000,
    });
    expect(posts).toHaveLength(0);
  });

  test("390px: empty customers + loans lists show copy + create CTAs", async ({
    page,
  }) => {
    const posts: any[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST") posts.push(r.url());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page, []);
    await setupEmptyResource(page, "**/rest/v1/customers*");
    await page.goto("/customers");
    await expect(page.locator('[data-testid="mobile-customers"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("No clients found")).toBeVisible();
    const customerCta = page.locator('[data-testid="mobile-empty-add-client"]');
    await expect(customerCta).toBeVisible();
    expect((await customerCta.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(
      44
    );
    await customerCta.click();
    await expect(page).toHaveURL(/\/customers\/new/);
    await expect(
      page.locator('[data-testid="mobile-customer-form-page"]')
    ).toBeVisible({ timeout: 15000 });

    await page.goto("/gold-ledger");
    await expect(
      page.locator('[data-testid="mobile-gold-ledger"]')
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("No loans found")).toBeVisible();
    const loanCta = page.locator('[data-testid="mobile-empty-new-loan"]');
    await expect(loanCta).toBeVisible();
    expect((await loanCta.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await loanCta.click();
    await expect(page).toHaveURL(/\/gold-ledger\/new/);
    await expect(
      page.locator('[data-testid="mobile-gold-loan-form-page"]')
    ).toBeVisible({ timeout: 15000 });
    expect(posts).toHaveLength(0);
  });

  test("390px: empty categories show No categories yet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupAuthenticatedContext(page);
    await setupEmptyResource(page, "**/rest/v1/ornament_categories*");
    await page.goto("/categories");
    await expect(page.getByText("No categories yet")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("No Data")).toHaveCount(0);
  });

  test("390px: empty-submit validation toast fires mobile variant, blocks POST", async ({
    page,
  }) => {
    // Config half: the quick-add validation path goes through notifyMobile
    // (small + bottom-docked + 2s), not bare antd message.
    const pos = src("../src/pages/pos/mobile-pos.tsx");
    expect(pos).toContain("notifyMobile");
    expect(pos).toContain("Please enter client name");

    // Behavioral half (mock-auth, no writes): empty quick-add save is blocked
    // client-side with zero POST traffic — the same submit that fires the
    // validation toast.
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
    await page.getByRole("button", { name: /save & select client/i }).click();
    await page.waitForTimeout(800);
    expect(posts).toHaveLength(0);
    await expect(
      page.locator('[data-testid="mobile-pos-quickadd-address"]')
    ).toBeVisible();
  });
});
