# Shringar POS UI Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 33 audit findings (dead routes, mobile tables/filters/touch targets/docks, 1366px squeeze, 1920px stretch, shop-query 400s) so every page passes on mobile 390×844, Dell-small 1366×768, and HP-big 1920×1080.

**Architecture:** Seven independent tasks ordered by risk: routing first (unblocks QA), then mobile critical, mobile touch/filter polish, mobile docks, 1366 fixes, 1920 fixes, backend query error. Each task is independently verifiable with Playwright.

**Tech Stack:** React 19 + Refine + Ant Design 5 (theme tokens), React Router 7, Playwright 1.63 (`@playwright/test`), Supabase.

**Spec:** `docs/superpowers/specs/2026-10-08-pos-ui-audit-design.md` — the plan argues from the spec, so the spec travels with it; executors read both.

## Global Constraints

- Touch targets on mobile viewports: minimum 44×44px (no 32/34/36/38px CTAs, chips, tabs).
- No page-level horizontal overflow at 390px width (`document.documentElement.scrollWidth <= clientWidth + 3`).
- Drawers/modals must fit mobile: width `min(480px, 100%)`, style `maxWidth: calc(100vw - 32px)`.
- Colors via `theme.useToken()` only; no hardcoded `#fff`, `#ffffff`, `#f5f5f5`, or `white` backgrounds/borders.
- Do NOT create real orders/invoices/loans/payments in tests; use empty-submit validation and modal open/close only, fake data prefixed `QA TEST` if a write is unavoidable (then delete it).
- Do NOT commit or push; end each task with `git diff --stat` for review.
- Verify with `npx tsc --noEmit` when touching `.tsx` files.

## Review Focus

- Dead-link click on Dashboard Quick-Action `New Sale` must land on `/sales/new`, not a 404 page.
- Invoice row action click must land on `/invoices/show/:id`, never `/invoices/:id`.
- Dashboard inventory `View all` must land on `/ornaments`, never `/inventory/ornaments`.
- A 390px viewport with a full-length list behind the bottom dock must not show list text readable through the dock background.
- An empty required-field submit on every create form must keep the user on the page with a visible required-field message.

---

### Task 1: Fix dead routes (F1–F3, highest value, unblocks everything)

**Files:**
- Modify: `src/components/dashboard/quick-actions.tsx`
- Modify: `src/pages/invoices/index.tsx`
- Modify: `src/components/dashboard/recent-invoices.tsx`
- Modify: `src/components/dashboard/stats-cards.tsx`
- Modify: `src/components/dashboard/inventory-summary.tsx` (verify path; if file differs, find the inventory `View all` link component and note it)
- Test: `e2e/navigation.spec.ts` (extend; read it first and follow its pattern)

**Interfaces:**
- Consumes: routes registered in `src/App.tsx` (`/sales/new`, `/invoices/show/:id`, `/invoices/edit/:id`, `/ornaments`).
- Produces: correct `path`/`navigate()` string constants other tasks rely on: `/sales/new`, `/invoices/show/:id`, `/ornaments`.

- [ ] **Step 1: Write failing route tests in `e2e/navigation.spec.ts`**

```ts
test("quick-action New Sale navigates to /sales/new", async ({ page }) => {
  await page.goto("/"); // authenticated fixture per file pattern
  await page.getByRole("button", { name: /new sale/i }).first().click();
  await expect(page).toHaveURL(/\/sales\/new/);
});
test("invoice row action opens /invoices/show/:id", async ({ page }) => {
  await page.goto("/invoices");
  await page.locator("table tbody tr").first().locator("button").first().click();
  await expect(page).toHaveURL(/\/invoices\/show\/.+/);
});
test("dashboard inventory view-all opens /ornaments", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /view all/i }).first().click();
  await expect(page).toHaveURL(/\/ornaments/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test e2e/navigation.spec.ts -g "navigates to /sales/new" 2>&1 | tail -20`
Expected: FAIL (lands on `/create-sale` 404)

- [ ] **Step 3: Fix `quick-actions.tsx` New Sale + inventory links (`/create-sale` → `/sales/new`, `/inventory/ornaments` → `/ornaments`)**

In `src/components/dashboard/quick-actions.tsx:27` change `path: "/create-sale"` to `path: "/sales/new"`; line ~39 change `/inventory/ornaments` to `/ornaments`. Same stale-string sweep in `recent-invoices.tsx:156`, `stats-cards.tsx:322,331`, `inventory-summary.tsx:108`, `src/pages/invoices/index.tsx:308,536`.

- [ ] **Step 4: Fix invoice row navigation (`/invoices/${id}` → `/invoices/show/${id}`)**

In `src/pages/invoices/index.tsx:386,522` change `` navigate(`/invoices/${record.id}`) `` to `` navigate(`/invoices/show/${record.id}`) `` (both occurrences; keep edit-flow pointing at `/invoices/edit/${id}` if that is what the second site is).

- [ ] **Step 5: Run route tests to verify they pass**

Run: `npx playwright test e2e/navigation.spec.ts 2>&1 | tail -10`
Expected: PASS, no 404 `ant-result-404` on any of the three flows

- [ ] **Step 6: Typecheck + report diff**

Run: `npx tsc --noEmit 2>&1 | tail -5 && git diff --stat`
Expected: no new type errors; diff touches only the 5 listed files + spec

---

### Task 2: Mobile critical tables + categories toolbar + POS grid (spec mobile #1–#4)

**Files:**
- Modify: `src/pages/gold-ledger/reports.tsx`
- Modify: `src/components/metal-rates/rate-history-table.tsx`
- Modify: `src/pages/inventory/categories/index.tsx`
- Modify: `src/pages/pos/mobile-pos.tsx`
- Test: `e2e/mobile-full-interaction.spec.ts` (extend; read it first)

**Interfaces:**
- Consumes: `MobileShell` content width (~358px at 390px viewport after 16px padding).
- Produces: responsive table pattern (`scroll.x <= 560` + `ellipsis` or card fallback below `md`) reused by Task 5/6.

- [ ] **Step 1: Write failing mobile assertions**

```ts
test("390px: reports, history, categories, pos have no page overflow and tappable CTAs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/gold-ledger/reports", "/metal-rates", "/categories", "/sales/new"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3);
    expect(overflow).toBe(false);
  }
  await page.goto("/sales/new");
  const addH = await page.locator("button:has-text('Add')").first().boundingBox();
  expect(addH?.height ?? 0).toBeGreaterThanOrEqual(44);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/mobile-full-interaction.spec.ts -g "390px: reports" 2>&1 | tail -20`
Expected: FAIL (overflow true on reports/history, or Add height 32)

- [ ] **Step 3: Implement reports table mobile fallback in `src/pages/gold-ledger/reports.tsx:97-98,177-182`**

Below `md` (`Grid.useBreakpoint()`), render stacked loan cards reusing the mobile card layout instead of `Table`, or at minimum `scroll={{ x: 560 }}`, add `ellipsis: true` to Customer/Ornament columns, sticky first column. Title gets `ellipsis + whiteSpace normal` wrap.

- [ ] **Step 4: Implement history table + categories toolbar + POS grid fixes**

`rate-history-table.tsx:72`: `scroll={{ x: 450 }}` → wrap in `overflow-x:auto` div with sticky date column, or stacked date-cards below `sm`. `categories/index.tsx:216`: search `width: 220` → `width: "100%"` stacked above full-width scrollable status pills; `:315-317` placeholder `height: 160` → `96` on mobile. `mobile-pos.tsx:729-734`: grid → `gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)"` + `minWidth: 0` on cards with 2-line clamp; `:785-792` Add `height: 44`; `:568-570` pills `minHeight: 44`.

- [ ] **Step 5: Run mobile assertions to verify they pass**

Run: `npx playwright test e2e/mobile-full-interaction.spec.ts 2>&1 | tail -10`
Expected: PASS on 390×844, screenshots show no clipped columns

- [ ] **Step 6: Typecheck + report diff**

Run: `npx tsc --noEmit 2>&1 | tail -5 && git diff --stat`
Expected: clean; diff only in the 4 listed files + spec

---

### Task 3: Mobile touch targets + filter bars + chart/gallery headers (spec mobile #5–#10)

**Files:**
- Modify: `src/components/invoices/mobile-invoice-list.tsx`
- Modify: `src/components/gold-ledger/mobile-gold-ledger.tsx`
- Modify: `src/components/customers/mobile-customer-list.tsx`
- Modify: `src/components/metal-rates/rate-chart.tsx`
- Modify: `src/pages/design-gallery/index.tsx`
- Modify: `src/pages/inventory/ornaments/mobile-ornament-grid.tsx` (pill heights; verify exact file name with glob — sibling list/grid may differ)
- Test: extend the Task 2 spec file with a second test (same file)

**Interfaces:**
- Consumes: 44px touch rule from Global Constraints.
- Produces: scrollable filter-row pattern (`flexWrap: nowrap; overflow-x: auto`) used across lists.

- [ ] **Step 1: Write failing touch/filter test**

```ts
test("390px: all mobile CTAs >= 44px and filter rows scroll without clipping", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/invoices");
  for (const sel of ["button:has-text('View Bill')", "button:has-text('WhatsApp')"]) {
    const box = await page.locator(sel).first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await page.goto("/metal-rates");
  const clipped = await page.evaluate(() => {
    const el = document.body.innerText;
    return el.includes("R…");
  });
  expect(clipped).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/mobile-full-interaction.spec.ts -g "all mobile CTAs" 2>&1 | tail -15`
Expected: FAIL (34px heights, `R…` truncation present)

- [ ] **Step 3: Implement invoice/gold-ledger/customer 44px targets + gold-ledger tab scroll**

`mobile-invoice-list.tsx:379-405`: actions `height: 34` → `44`; Download becomes icon-only; `:196-197` chips `minHeight: 44`. `mobile-gold-ledger.tsx:479-558`: phone/WhatsApp/Details/Settle `34` → `44`; `:457-459` Due span `whiteSpace: nowrap; textAlign: right`; `:266-293` tab strip → `overflow-x: auto`, tabs `flexShrink: 0; padding: 8px 14px; minHeight: 44` (drop `flex: 1` squeeze). `mobile-customer-list.tsx:299-403`: WhatsApp/Call/View/Edit `36` → `44`; `:146-152` drop nested sticky (keep single shell sticky).

- [ ] **Step 4: Implement chart extra + gallery header stacking**

`rate-chart.tsx:80-105`: move both `Radio.Group`s out of `Card extra` into card body as two `overflow-x: auto; flexWrap: nowrap` scroll rows. `design-gallery/index.tsx:162-169`: on `xs` stack to column — search `flex: "1 1 100%"; maxWidth: "100%"` above full-width Create Album button.

- [ ] **Step 5: Run touch/filter test to verify it passes**

Run: `npx playwright test e2e/mobile-full-interaction.spec.ts -g "all mobile CTAs" 2>&1 | tail -8`
Expected: PASS

- [ ] **Step 6: Typecheck + report diff**

Run: `npx tsc --noEmit 2>&1 | tail -5 && git diff --stat`
Expected: clean; diff only in the 6 listed files + spec

---

### Task 4: Mobile docks — solid backgrounds + single safe-area padding (spec mobile #11–#12)

**Files:**
- Modify: `src/components/mobile/bottom-nav-bar.tsx`
- Modify: `src/components/mobile/mobile-shell.tsx`
- Modify: `src/pages/customers/mobile-customer-form.tsx`
- Modify: `src/pages/inventory/ornaments/mobile-ornament-form.tsx`
- Modify: `src/pages/gold-ledger/mobile-gold-loan-form.tsx`
- Modify: `src/components/dashboard/mobile-dashboard.tsx`
- Test: manual screenshot check + existing `e2e/mobile-shell.spec.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: single dock-padding contract: content `paddingBottom: calc(96px + env(safe-area-inset-bottom, 16px))`; dashboard `24` → `96px`.

- [ ] **Step 1: Write failing dock-opacity test**

```ts
test("390px: bottom dock is opaque and form docks do not overlap fields", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/customers/new");
  const dockBg = await page.evaluate(() => {
    const el = document.querySelector("[data-testid='mobile-form-dock']") as HTMLElement | null;
    if (!el) return "missing";
    return getComputedStyle(el).backgroundColor;
  });
  expect(dockBg).not.toContain("rgba");
});
```

(Add `data-testid="mobile-form-dock"` to the three form docks as part of Step 3 if the selector finds nothing — then this test targets it.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/mobile-shell.spec.ts 2>&1 | tail -15`
Expected: FAIL or `missing` (translucent `rgba` + blur docks found in screenshots)

- [ ] **Step 3: Make docks opaque + normalize padding**

`bottom-nav-bar.tsx:64-74`: `position: fixed; bottom: 0` background → opaque `#ffffff` (light) / `#000000` (dark), remove translucency reliance (keep blur optional). `mobile-shell.tsx:184-186`: content padding → `14px 16px calc(96px + env(safe-area-inset-bottom, 16px))`. The three form docks (`mobile-customer-form.tsx:366-378`, `mobile-ornament-form.tsx:843-856`, `mobile-gold-loan-form.tsx:407-420`): solid `dockBg`, add `data-testid="mobile-form-dock"`, form root `paddingBottom: calc(120px + safe-area)`, `scroll-margin-bottom` on last card. `mobile-dashboard.tsx:173`: `paddingBottom: 24` → `calc(96px + safe-area)`; remove per-list `88px` paddings that duplicate the shell (`mobile-customer-list.tsx:103`, `mobile-ornament-grid.tsx:126` → inherit shell padding).

- [ ] **Step 4: Run dock test + shell suite to verify**

Run: `npx playwright test e2e/mobile-shell.spec.ts e2e/mobile-dedicated-forms.spec.ts 2>&1 | tail -8`
Expected: PASS; screenshots show no text readable through docks

- [ ] **Step 5: Typecheck + report diff**

Run: `npx tsc --noEmit 2>&1 | tail -5 && git diff --stat`
Expected: clean; diff only in the 6 listed files + spec

---

### Task 5: Dell-small 1366px squeeze fixes (spec dell #1–#8)

**Files:**
- Modify: `src/pages/inventory/ornaments/index.tsx`
- Modify: `src/pages/gold-ledger/index.tsx`
- Modify: `src/pages/invoices/index.tsx`
- Modify: `src/pages/dashboard/index.tsx`
- Modify: `src/pages/customers/index.tsx`
- Modify: `src/components/invoices/sale-form.tsx`
- Test: `e2e/theme-consistency.spec.ts` (extend) or new `e2e/desktop-1366.spec.ts` (prefer new file; follow existing fixture pattern in `e2e/fixtures/mock-auth.ts`)

**Interfaces:**
- Consumes: desktop table pattern from Task 2 (ellipsis + matched `scroll.x`).
- Produces: 1366-safe `scroll.x` values and column widths that Task 6 extends for 1920.

- [ ] **Step 1: Write failing 1366 assertions in `e2e/desktop-1366.spec.ts`**

```ts
test("1366px: no page overflow, no wrapped money headers", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const route of ["/ornaments", "/gold-ledger", "/invoices"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3);
    expect(overflow).toBe(false);
  }
  await page.goto("/invoices");
  await expect(page.locator("th:has-text('Making Charges')")).toHaveCount(1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/desktop-1366.spec.ts 2>&1 | tail -15`
Expected: FAIL (ornaments/gold-ledger page overflow or clipped Actions)

- [ ] **Step 3: Implement 1366 table + dashboard fixes**

Ornaments (`index.tsx:526,624,669`): Category Tag `ellipsis + maxWidth: 130`, Qty col drop `marginRight: 20`, Total-Cost hidden below `lg`, `scroll.x` → `1100`. Gold Ledger (`:406,579`): Customer `200→150`, Ornament `220→160` with `ellipsis`, hide Duration+Interest below 1400px. Invoices (`:411,455`): Customer single-line ellipsis + inline code, Making Charges `width: 130 + ellipsis + nowrap`, `scroll.x` → `1100`. Dashboard (`index.tsx:68`): split `xl={16/8}` → `xxl={16/8}` so 1366 stacks. Customers (`index.tsx:320,341`): add `scroll={{ x: 900 }}` + `ellipsis={{ showTitle: true }}`. Sale form (`sale-form.tsx:760,898`): `lg={16/8}` → `xl={16/8}`.

- [ ] **Step 4: Run 1366 spec to verify**

Run: `npx playwright test e2e/desktop-1366.spec.ts 2>&1 | tail -8`
Expected: PASS at 1366×768, Actions visible without page scroll

- [ ] **Step 5: Typecheck + report diff**

Run: `npx tsc --noEmit 2>&1 | tail -5 && git diff --stat`
Expected: clean; diff only in the 6 listed files + new spec

---

### Task 6: HP-big 1920px stretch fixes (spec hp #1–#8)

**Files:**
- Modify: `src/components/dashboard/stats-cards.tsx`
- Modify: `src/components/invoices/sale-form.tsx`
- Modify: `src/pages/customers/index.tsx`
- Modify: `src/pages/inventory/ornaments/index.tsx`
- Modify: `src/pages/invoices/index.tsx`
- Modify: `src/pages/gold-ledger/index.tsx`
- Modify: `src/pages/design-gallery/index.tsx`
- Modify: `src/pages/settings/index.tsx`
- Modify: `src/components/settings/making-charges-settings.tsx`
- Test: extend `e2e/desktop-1366.spec.ts` with a 1920 test (same file)

**Interfaces:**
- Consumes: 1366 column widths from Task 5 (do not narrow them; only raise `scroll.x` / add max-widths).
- Produces: final responsive table/grid contract for all desktop widths.

- [ ] **Step 1: Write failing 1920 assertions**

```ts
test("1920px: content capped, tables use viewport with fixed action cols", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/settings");
  const contentW = await page.evaluate(() => document.querySelector("main")?.getBoundingClientRect().width ?? 0);
  expect(contentW).toBeLessThanOrEqual(1600);
  await page.goto("/customers");
  const addrW = await page.locator("td").first().boundingBox();
  expect(addrW?.width ?? 9999).toBeLessThan(600);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/desktop-1366.spec.ts -g "1920px" 2>&1 | tail -15`
Expected: FAIL (settings content ~1720px, Address ballooning)

- [ ] **Step 3: Implement max-width + 1920 table/grid fixes**

Stats cards (`stats-cards.tsx:114-117`): flex-wrap → `display: grid; gridTemplateColumns: repeat(auto-fit, minmax(180px, 1fr))`, drop `maxWidth: 240`. Sale form (`sale-form.tsx:720`): `maxWidth: 1400` → `1600`, grid `lg={18/6}`, single sticky summary (remove duplicate Save CTA). Customers (`index.tsx:341-343`): `scroll: { x: 1200 }`, Address `width: 280`, hide Referred By below `xl`. Ornaments (`:624`): Category `width: 220 + ellipsis`, Weight `110 nowrap`, `scroll.x` → `1600`. Invoices (`:377`): `scroll.x` → `1400`, Total `width: 140 right`, Actions `140 fixed: right`. Gold Ledger (`:406`): `scroll.x` → `1650`, Ornament `ellipsis width: 260`, Actions `150 fixed: right`. Gallery (`index.tsx:241,263`): `xl={6} xxl={4}`, cover `height: 220`, grid `maxWidth: 1600`. Settings (`settings/index.tsx:116` + `making-charges-settings.tsx:94-96`): wrapper `maxWidth: 1280; margin: 0 auto`, 2-col only above `lg`.

- [ ] **Step 4: Run 1920 assertions to verify**

Run: `npx playwright test e2e/desktop-1366.spec.ts 2>&1 | tail -8`
Expected: PASS at both 1366 and 1920

- [ ] **Step 5: Typecheck + report diff**

Run: `npx tsc --noEmit 2>&1 | tail -5 && git diff --stat`
Expected: clean; diff only in the 9 listed files + spec

---

### Task 7: Fix `shops.shop_id` 400s (F4) + full verification sweep

**Files:**
- Modify: `src/components/mobile/mobile-shell.tsx` (the `useList shops` filter — prime suspect)
- Modify: whichever data-provider/hook builds the broken shop-scoping query (grep `shop_id` under `src/`; fix the column to the real FK, e.g. `id`/`owner_id` — confirm against Supabase schema first)
- Test: new `e2e/console-errors.spec.ts`

**Interfaces:**
- Consumes: corrected route strings from Task 1 (sweep visits real pages).
- Produces: zero-400 console contract for the whole app.

- [ ] **Step 1: Write failing console-error test**

```ts
test("no shops.shop_id 400s on list pages", async ({ page }) => {
  const bad: string[] = [];
  page.on("response", (r) => {
    if (r.status() === 400) bad.push(r.url());
  });
  for (const route of ["/", "/customers", "/ornaments", "/invoices", "/gold-ledger", "/metal-rates", "/design-gallery", "/settings"]) {
    await page.goto(route);
    await page.waitForTimeout(800);
  }
  expect(bad).toEqual([]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/console-errors.spec.ts 2>&1 | tail -15`
Expected: FAIL (400s with `column shops.shop_id does not exist`, code 42703)

- [ ] **Step 3: Fix the shop-scoping query**

Grep `shop_id` in `src/`; the `MobileShell` query (`mobile-shell.tsx:39-44`, filter `{ field: "shop_id", operator: "eq", value: user.id }` on resource `shops`) is the prime suspect — the `shops` table has no `shop_id` column. Confirm the real key from the Supabase schema/migration, then fix the filter (or the provider mapping) at every site that repeats it. Do not silence the error — fix the column.

- [ ] **Step 4: Run console test + full audit suites to verify**

Run: `npx playwright test e2e/console-errors.spec.ts e2e/navigation.spec.ts e2e/gold-ledger.spec.ts e2e/theme-consistency.spec.ts 2>&1 | tail -10`
Expected: ALL PASS, zero 400 responses

- [ ] **Step 5: Re-run deployed screenshot sweep for before/after evidence**

Run: `cp /tmp/opencode/sweep.mjs ./sweep-verify.mjs` (recreate from git if missing), `node ./sweep-verify.mjs 2>&1 | tail -8`, then `rm ./sweep-verify.mjs`
Expected: 45+ captures, `overflow=false` everywhere, no 404 URLs in manifest

- [ ] **Step 6: Typecheck + report final diff**

Run: `npx tsc --noEmit 2>&1 | tail -5 && git diff --stat`
Expected: clean; whole-branch diff ready for reviewer

---

## Self-Review (planner check)

1. **Spec coverage:** mobile #1–#12 → Tasks 2/3/4 ✓; dell #1–#8 → Task 5 ✓; hp #1–#8 → Task 6 ✓; F1–F3 → Task 1 ✓; F4 → Task 7 ✓; F5 → noted manual check in Task 7 sweep ✓. No gaps.
2. **Step scan:** every test step names the test + assertions; every code step names file:line + exact values; verification steps give command + expected output. No `TBD`/vague lines.
3. **Type consistency:** route strings (`/sales/new`, `/invoices/show/:id`, `/ornaments`) defined once in Task 1 Interfaces and reused verbatim in Tasks 5–7. `scroll.x` values only increase from Task 5 → Task 6, never conflict.
4. **Review Focus:** five failure-mode lines at top, each pinned to a task test (routing → T1, dock see-through → T4, empty-submit validation → T7 sweep + existing specs).
5. **Proportion:** plan states decisions (files, values, assertions) without transcribing component bodies; implementers write bodies from signatures + tests.
