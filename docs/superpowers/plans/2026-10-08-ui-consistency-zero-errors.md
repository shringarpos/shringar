# UI Consistency + Zero Errors Fix Plan (2026-10-08, batch 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the live-crawl Low issues + ledgered polish so the app has zero errors and consistent 44px/token UI.

**Architecture:** Two independent tasks: product fixes (validation wiring, 44px CTAs, token sweep) and spec alignment (stale testids/order/routes + pageerror guard). Product first, specs second (specs pin product behavior).

**Tech Stack:** React 19 + Ant Design 5 tokens, Playwright 1.63, Refine.

**Spec:** Live-crawl report 2026-10-08 (in-chat) + `docs/superpowers/specs/2026-10-08-pos-ui-audit-design.md` (design-system rules: 44px min, tokens only, no hardcoded light colors).

## Global Constraints

- 44px minimum hit area for ALL interactive elements on mobile (no exceptions for header CTAs this time).
- Text-on-primary `#fff` → `token.colorTextLightSolid`; never introduce new hardcoded colors; verify `token` is in scope (import via `theme.useToken()`).
- No real backend writes in tests (empty-submit/modal open-close only, mock-auth on localhost).
- `npx tsc --noEmit` clean after `.tsx` changes. Do NOT commit to main; work on branch `sdd/ui-consistency-zero-errors`. Never push.

## Review Focus

- Add-Customer empty OK must show inline required errors and create nothing.
- Every CTA touched must measure ≥44px in a 390px Playwright probe.
- No visual regression in dark mode (screenshot light+dark for dashboard hero changes).
- Stale specs must fail-before/pass-after honestly (no weakening assertions to force green).

---

### Task 1: Product fixes — customer modal validation, 44px CTAs, token sweep

**Files:**
- Modify: `src/components/customers/customer-modal.tsx`
- Modify: `src/components/dashboard/mobile-dashboard.tsx`
- Modify: `src/components/invoices/mobile-invoice-list.tsx` (header New Sale 38px — verify by grep)
- Modify: `src/components/gold-ledger/mobile-gold-ledger.tsx` (header button ~38px — verify)
- Modify: `src/pages/customers/mobile-customer-form.tsx` (Add Client 38px — this is the dedicated form dock CTA; raise to 44)
- Modify: `src/components/inventory/mobile-ornament-grid.tsx` (card Edit 36×36 → 44)
- Modify (token sweep, text-on-primary only): `mobile-invoice-list.tsx:204`, `mobile-gold-ledger.tsx:243`, `mobile-customer-list.tsx:239`, `mobile-ornament-grid.tsx:215`, `mobile-pos.tsx:492,585` (`"#fff"` → `token.colorTextLightSolid`)
- Test: extend `e2e/desktop-1366.spec.ts` or `e2e/mobile-full-interaction.spec.ts` (follow existing patterns)

**Interfaces:**
- Consumes: `CustomerModal` props contract (`modalProps`, `formProps.initialValues`, `onFinish`, `close`) — do not change the interface, only internals.
- Produces: sub-44px-free mobile UI + token-only text colors that Task 2 specs pin.

- [ ] **Step 1: Write failing tests**

```ts
test("desktop Add Customer empty OK shows required errors, creates nothing", async ({ page }) => {
  await page.goto("/customers");
  await page.getByRole("button", { name: /add customer/i }).click();
  await page.locator(".ant-modal-footer .ant-btn-primary").click();
  await expect(page.locator(".ant-form-item-explain-error").first()).toBeVisible();
});
test("390px: dashboard + header CTAs all >= 44px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const sel of ["button:has-text('New Bill')", "button:has-text('View All')"]) {
    const box = await page.locator(sel).first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx playwright test <specfile> -g "Add Customer empty OK" 2>&1 | tail -8`
Expected: FAIL (0 error nodes; heights 29/24)

- [ ] **Step 3: Wire CustomerModal submit footer in `customer-modal.tsx`**

Add `const [form] = Form.useForm()`; `<Form form={form} {...formProps}>`; Modal `footer` = explicit `[Cancel → modalProps.onCancel, Save/Add (primary, htmlType submit via form.submit())]`; keep `destroyOnHidden` (remount gives fresh initialValues per open). Button label follows action (Add/Save). No interface changes.

- [ ] **Step 4: 44px CTA sweep (mobile-dashboard + headers + Edit)**

`mobile-dashboard.tsx:260-278` New Bill: `minHeight: 44` (keep pill aesthetic); `:483,556` View All + :327 heights 34/36 → 44. Header CTAs (invoice New Sale, gold-ledger header, customer Add Client dock, ornament card Edit): raise to true 44px hit areas. Screenshot 390px light AND dark for dashboard hero; if `#ffffff` New-Bill bg bleeds in dark, switch bg to `token.colorBgContainer` + text to `token.colorPrimary`.

- [ ] **Step 5: Token sweep `#fff` → `token.colorTextLightSolid`**

The 6 listed text-on-primary sites only. Confirm `token` in scope in each file first; do not touch other hardcodes (hero gradients, status greens — separate workstream).

- [ ] **Step 6: Run tests GREEN + tsc + diff**

Run: targeted specs PASS; `npx tsc --noEmit` clean; `git diff --stat` lists only brief files + spec.

---

### Task 2: Spec alignment — testids, sidebar order, crawler refresh, pageerror guard

**Files:**
- Modify: `e2e/mobile-full-interaction.spec.ts` (tests 4–6 `mobile-add-*` → `mobile-new-*`)
- Modify: `e2e/mobile-gold-ledger.spec.ts` (`mobile-loan-filter-all` — first check components for tab testids; if tabs lack testids, ADD `data-testid="mobile-loan-filter-<key>"` to the tab buttons in `mobile-gold-ledger.tsx` (product one-liner, allowed) rather than weakening the spec; else update spec)
- Modify: `e2e/navigation.spec.ts` test 1 (sidebar order — assert ACTUAL sidebar order; verify by rendering, do not reorder product code)
- Modify: `e2e/ui-crawler-audit.spec.ts` (replace quarantined dead-route block: visit `/sales/new` instead of `/create-sale` + `/pos/create`; remove skip)
- Modify: `e2e/console-errors.spec.ts` (add `pageerror` listener failing on any uncaught page exception across the 8 list pages)
- Test: the modified specs themselves

**Interfaces:**
- Consumes: Task 1 product behavior (44px CTAs, modal validation) — re-run Task 1 specs to confirm still green.

- [ ] **Step 1: Run the 4 stale specs to record RED**

Run: `npx playwright test e2e/mobile-full-interaction.spec.ts e2e/mobile-gold-ledger.spec.ts e2e/navigation.spec.ts 2>&1 | tail -12`
Expected: FAIL on testid/order assertions (proves staleness, not product bugs)

- [ ] **Step 2: Align specs (testids → `mobile-new-*`; filter testid added to component if missing; sidebar order → actual; crawler → `/sales/new`)**

Minimal edits; never weaken an assertion to force green (e.g. keep `.toBeVisible()` semantics; keep URL + 404-absence assertions).

- [ ] **Step 3: Add pageerror guard to console-errors.spec.ts**

```ts
test("no uncaught page errors on list pages", async ({ page }) => {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  for (const route of ["/", "/customers", "/ornaments", "/invoices", "/gold-ledger", "/metal-rates", "/design-gallery", "/settings"]) {
    await page.goto(route);
    await page.waitForTimeout(800);
  }
  expect(errs).toEqual([]);
});
```

- [ ] **Step 4: Run all touched specs GREEN + tsc + diff**

Run: each spec file PASS; `npx tsc --noEmit` clean; `git diff --stat` only brief files.
