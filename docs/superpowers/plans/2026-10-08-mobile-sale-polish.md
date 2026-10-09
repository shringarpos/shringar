# Mobile Sale-Form Error + Native Polish Plan (2026-10-08, batch 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate every mobile creation error (customer/gold-loan schema mismatches) and bring mobile sale/inventory/rates/charges UI to native parity with desktop.

**Architecture:** Schema fixes first (unblock creation), then sale-flow features (empty-state CTA, metal scope), then form parity + polish (SKU, stock input, empty states, toasts, categories, rate filters, making charges). Later tasks consume earlier payload contracts.

**Tech Stack:** React 19 + Ant Design 5 + Refine + Supabase (PostgREST). Migrations live in `supabase/migrations/` — read them as the schema authority; DO NOT write new migrations (fix code to match schema).

**Spec:** User's 15-item list (in-chat, 2026-10-08) + `docs/superpowers/specs/2026-10-08-pos-ui-audit-design.md` (44px min, tokens only).

## Global Constraints

- Schema authority is `supabase/migrations/*.sql` — code must send only columns that exist (verified: `customers` has NO `gst_number`/pan; `gold_loans` has NO `created_by`, owner column is `user_id`).
- No real backend writes in tests (empty-submit validation, modal open/close, mock-auth localhost; source-level payload assertions where E2E writes are impossible).
- 44px minimum touch targets; theme tokens only, no new hardcoded colors.
- Metal scope is gold + silver ONLY for now — remove/hide diamond (and gem) filter options everywhere; do NOT delete diamond data handling, only the UI affordances to select/filter it.
- `npx tsc --noEmit` clean after `.tsx` changes. Work on branch `sdd/mobile-sale-polish`. Never push.

## Review Focus

- Quick-add client with name+phone+address creates payload WITHOUT address null and WITHOUT gst_number key (the 23502 + schema-cache pair).
- Gold-loan payload carries `user_id`, never `created_by`.
- Diamond cannot be selected/filtered in POS, inventory grid, or ornament forms, but existing diamond records still render.
- Mobile making-charge inclusion matches desktop calculation semantics (same rate source, same totals effect).
- A mobile toast is visibly smaller/docked differently from desktop (screenshot evidence, light+dark).

---

### Task 1: Customer creation errors — address 23502 + gst_number/pan schema cache + pan optional + empty user text

**Files:**
- Modify: `src/pages/pos/mobile-pos.tsx` (quick-add client: add required Address field; strip `gst_number`/pan from payload if present)
- Modify: `src/components/invoices/sale-form.tsx` (desktop quick-add: same treatment — verify by grep)
- Modify: `src/pages/customers/mobile-customer-form.tsx` (strip `gst_number` (`:70`) + pan if present from payload; pan OPTIONAL — no required rule; GSTIN field: remove or keep? DECISION: remove GSTIN/pan inputs from customer forms entirely since columns don't exist; shop GSTIN untouched)
- Modify: `src/components/customers/customer-modal.tsx` (strip non-schema keys from create/clone payload if present — verify by grep for gst_number/pan)
- Modify: user-select empty text wherever customer search Select has `notFoundContent`/Empty (grep `notFoundContent` under `src/pages/pos` + `src/components/invoices`; copy: "No existing user")
- Test: extend `e2e/desktop-1366.spec.ts` or new `e2e/mobile-sale-errors.spec.ts`

**Interfaces:**
- Consumes: `customers` columns (migration `20261005130036_init_schema.sql:257-282`): shop_id, customer_code, name, address NOT NULL, phone NOT NULL, email, alternate_phone, reference_by, is_active, created_by, updated_by.
- Produces: customer payload contract (no gst_number/pan keys ever) used by Tasks 3/5.

- [ ] **Step 1: Write failing payload tests**

```ts
test("quick-add client payload has address and no gst_number key", async ({ page }) => {
  let payload: any = null;
  page.on("request", async (r) => {
    if (r.url().includes("/rest/v1/customers") && r.method() === "POST") payload = r.postDataJSON();
  });
  // open quick-add, fill name+phone+address, submit with QA-prefixed name...
});
```

NOTE: E2E writes are forbidden, so assert at two levels: (a) UI — Address input visible+required and GSTIN/pan inputs ABSENT from customer forms; (b) source — `grep gst_number` under customer payload builders returns only shop/onboarding paths. Implementer: prefer UI assertions; use source grep as the pin where submission can't run without writes.

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test e2e/mobile-sale-errors.spec.ts -g "quick-add client payload" 2>&1 | tail -8`
Expected: FAIL (no Address input in quick-add; gst_number key present)

- [ ] **Step 3: Implement quick-add Address + strip non-schema keys in the 4 files**

Quick-add gets Address (required, 44px-high input); payloads drop `gst_number`/pan keys; pan has no required rule anywhere on customers; user-select `notFoundContent="No existing user"`.

- [ ] **Step 4: Run tests GREEN + tsc + diff**

Run: spec file PASS; `npx tsc --noEmit` clean; `git diff --stat` only brief files.

---

### Task 2: Gold-loan created_by schema error

**Files:**
- Modify: `src/pages/gold-ledger/mobile-gold-loan-form.tsx:76` (`created_by: userId` → `user_id: userId`)
- Modify: `src/pages/gold-ledger/create.tsx` (desktop loan create — verify by grep for created_by)
- Modify: any other `gold_loans`/`gold_loan` writers (grep `resource: "gold_loans"` + `gold_loan` payload builders)
- Test: extend `e2e/mobile-sale-errors.spec.ts` (Task 1 file)

**Interfaces:**
- Consumes: `gold_loans` columns (migration `20261005154854_add_gold_ledger_loans.sql:2-30`): user_id NOT NULL (RLS requires `user_id = auth.uid()`), NO created_by.
- Produces: nothing downstream.

- [ ] **Step 1: Write failing source+UI test**

UI: loan form renders and empty-submit shows required errors (no write). Source pin: `created_by` absent from all gold_loans payload builders (grep in test via readFileSync, or assert request payload on a QA-prefixed submit — NO, no writes; use UI + source pins).

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/mobile-sale-errors.spec.ts -g "gold loan" 2>&1 | tail -8`
Expected: FAIL (`created_by` present in builder)

- [ ] **Step 3: Replace `created_by` with `user_id` in all gold_loans writers**

Keep the same user identity value; RLS policies require `user_id = auth.uid()`.

- [ ] **Step 4: Run GREEN + tsc + diff**

---

### Task 3: New-sale empty state + gold/silver-only scope

**Files:**
- Modify: `src/pages/pos/mobile-pos.tsx` (empty ornaments result → "Add piece" CTA navigating to `/ornaments/new` (mobile dedicated form); filter pills `:562` `["all","gold","silver","diamond"]` → `["all","gold","silver"]`)
- Modify: `src/components/inventory/mobile-ornament-grid.tsx` (`:41` diamond/gem branch + `:116` diamond filter key — remove diamond option; existing diamond records still render with their badge)
- Modify: `src/pages/inventory/ornaments/index.tsx` (desktop diamond filter if present — verify by grep)
- Modify: `src/components/invoices/sale-form.tsx` (desktop POS metal filter if present — verify by grep)
- Modify: ornament create forms (mobile `mobile-ornament-form.tsx` + desktop `ornament-drawer.tsx`) — metal options gold/silver only (verify current options by grep)
- Test: extend `e2e/mobile-sale-errors.spec.ts`

**Interfaces:**
- Consumes: customer payload contract (Task 1) for the add-piece flow smoke (no writes).
- Produces: gold/silver-only filter contract reused by Task 5 rate/parity checks.

- [ ] **Step 1: Write failing tests**

```ts
test("390px: empty ornament search shows Add-piece CTA to /ornaments/new", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sales/new");
  await page.locator('input[placeholder*=" ornament" i]').fill("zzz-no-such-piece");
  await expect(page.getByRole("button", { name: /add piece/i })).toBeVisible();
});
test("no diamond filter option on POS + inventory", async ({ page }) => {
  await page.goto("/sales/new");
  await expect(page.getByRole("button", { name: /^diamond$/i })).toHaveCount(0);
});
```

(Adjust selectors to real DOM after first read; keep semantics: CTA navigates to `/ornaments/new`, diamond unselectable.)

- [ ] **Step 2: Run to verify they fail**

Expected: FAIL (no CTA; diamond present)

- [ ] **Step 3: Implement CTA + remove diamond options in the listed files**

Empty state ONLY when a search/filter yields zero (not on loading); CTA `navigate("/ornaments/new")`, 44px. Diamond: remove option entries; keep rendering of existing diamond records.

- [ ] **Step 4: Run GREEN + tsc + diff**

---

### Task 4: Inventory form — centered stock input + desktop SKU logic port

**Files:**
- Modify: `src/pages/inventory/ornaments/mobile-ornament-form.tsx` (stock/quantity number input: centered text, consistent padding — inspect current style first)
- Modify: desktop SKU source `src/components/inventory/ornaments/ornament-drawer.tsx` (READ ONLY — port FROM here)
- Modify: `src/pages/inventory/ornaments/mobile-ornament-form.tsx` (port SKU generation/prefill/validation logic TO here, adapted to mobile form conventions)
- Test: extend `e2e/mobile-sale-errors.spec.ts` (centered style via computed `text-align: center`; SKU auto-value parity: same inputs → same SKU on both forms, asserted at UI level without saving)

**Interfaces:**
- Consumes: desktop SKU semantics (read, don't change desktop file).
- Produces: identical SKU contract on both forms.

- [ ] **Step 1: Write failing tests** (style pin + SKU parity pin)
- [ ] **Step 2: Run to verify they fail** (Expected: FAIL)
- [ ] **Step 3: Implement centering + port SKU logic** (no desktop behavior change)
- [ ] **Step 4: Run GREEN + tsc + diff**

---

### Task 5: Mobile native polish — metal-rates drawer inputs, categories, rate filters, making charges + parity

**Files:**
- Modify: rate-edit/drawer inputs (find via `rate-edit-popover.tsx` + `rate-top-section.tsx` + `pages/metal-rates/index.tsx`: remove third-color faded wrapper/padding — inputs sit directly on card background, token borders only)
- Modify: `src/pages/inventory/categories/index.tsx` (mobile: replace big-box cards with native compact rows — 56-64px thumbnail, name+count, chevron; keep desktop grid untouched behind breakpoint)
- Modify: `src/components/metal-rates/rate-chart.tsx` (mobile rate-trend filters: single compact scroll row, smaller footprint — combine range + metal into one line where possible)
- Modify: making-charges mobile surface (find current: grep `making` under `src/components/settings` + `src/pages/settings`; redesign as native list/stepper rows with 44px targets)
- Modify: mobile sale + ornament + loan forms (parity: every desktop field incl. making-charge inclusion exists on mobile — audit desktop `sale-form.tsx`, `ornament-drawer.tsx`, loan `create.tsx` field lists vs mobile; ADD missing fields with same semantics/totals effect)
- Test: extend `e2e/mobile-sale-errors.spec.ts` (drawer input bg == card bg computed; category rows visible; filters single-row scrollable; making-charge toggle changes mobile totals identically to desktop formula)

**Interfaces:**
- Consumes: gold/silver-only contract (Task 3), customer payload contract (Task 1).
- Produces: final mobile UI.

- [ ] **Step 1: Write failing tests** (one pin per sub-item)
- [ ] **Step 2: Run to verify they fail**
- [ ] **Step 3: Implement polish + missing parity fields** (desktop files READ ONLY except where brief lists them — do not restyle desktop)
- [ ] **Step 4: Run GREEN + tsc + diff** (screenshots light+dark for redesigned surfaces)

---

### Task 6: Field-specific empty states + mobile toasts

**Files:**
- Modify: empty-state call sites (grep antd `Empty` + `emptyText` + "No data" under `src/pages` + `src/components`; replace generic copy with field-specific: "No categories yet", "No users found", "No ornaments", "No invoices", "No loans", "No designs" — keep component, change `description` + add CTA where a create route exists)
- Modify: toast calls on mobile paths (`react-toastify` usages — grep `toast.` under `src/`; add a mobile-specific variant: smaller, bottom-docked above tab bar, shorter autoClose — implement as a `notifyMobile`-style helper or responsive toast options, applied at mobile call sites)
- Test: extend `e2e/mobile-sale-errors.spec.ts` (empty-state copy assertions per route; toast class/duration assertion on an empty-submit validation toast at 390px)

**Interfaces:**
- Consumes: routes with create targets (Task 3 `/ornaments/new` pattern for empty-state CTAs).
- Produces: nothing downstream.

- [ ] **Step 1: Write failing tests** (copy pins + toast pins)
- [ ] **Step 2: Run to verify they fail**
- [ ] **Step 3: Implement copy swap + mobile toast variant**
- [ ] **Step 4: Run GREEN + tsc + diff**

---

## Self-Review

1. **Spec coverage:** items 1+4→T1 ✓; 11→T2 ✓; 3+5→T3 ✓; 6+8→T4 ✓; 2+12+13+14+15→T5 ✓; 9+10→T6 ✓. Item 7 skipped intentionally (no #7 in user list).
2. **Step scan:** each test step names assertions; code steps name files + exact values; no TBD lines.
3. **Type consistency:** `user_id` (gold_loans) vs `created_by` (customers, legitimate FK there) kept distinct; canonical routes `/sales/new`, `/ornaments/new`, `/ornaments`, `/categories` reused verbatim.
4. **Review Focus:** five failure modes → pinned: (a) quick-add without address must block with required error, not 23502 — T1 UI test; (b) payload with gst_number key must never be sent — T1 source pin; (c) loan payload with created_by must never be sent — T2 source pin; (d) diamond selectable after scope cut — T3 zero-count tests; (e) mobile totals diverge from desktop after making-charge inclusion — T5 totals-effect test.
5. **Proportion:** decisions + pins only; bodies left to implementers.
