# Totals Unification Plan (2026-10-09, product decisions applied)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify sale/loan/making totals across mobile + desktop per owner product decisions.

**Architecture:** Two sequential tasks on branch `sdd/totals-unification`: strip mobile GST to match desktop, then unify loan-interest convention + making-charge source. Sequential (both touch `mobile-pos.tsx` in disjoint regions).

**Tech Stack:** React 19 + Ant Design 5 + Supabase. No migrations.

**Spec:** Owner decisions 2026-10-09 (in-chat): (1) GST — desktop wins, mobile drops 3%; (2) loan interest — monthly girvi-% canonical; (3) making source — live `making_charges` config canonical. Senior-dev India rationale recorded in Rulings below.

## Global Constraints

- No real backend writes in tests (mock-auth localhost; formula/payload pins).
- 44px, tokens only, desktop branches preserved except where brief explicitly changes drawer behavior.
- Money math in paise integers with documented rounding; formulas commented at the computation site.
- `npx tsc --noEmit` clean. Work on branch `sdd/totals-unification`. Never push.

## Review Focus

- Mobile grand total for a fixed cart equals desktop grand total for the same cart (no GST term anywhere).
- A loan entered via drawer vs loan form yields identical interest_amount/total_amount for identical inputs.
- Mobile making per piece equals desktop making for the same piece under the same config.
- Existing tests pinning GST-aware math are updated, not deleted-weakened (assert exact desktop formula).

---

### Task 1: Remove mobile 3% GST (desktop parity)

**Files:**
- Modify: `src/pages/pos/mobile-pos.tsx` (GST row `:266-267`, drawer GST row, toggle-delta GST share, payload keys if GST persisted)
- Modify: `e2e/mobile-sale-errors.spec.ts` (update exact-delta test to desktop formula)
- Test: same spec file

**Interfaces:**
- Consumes: desktop formula `sale-form.tsx:545/592` (subtotal + making − discount, no GST) — read, don't change.
- Produces: GST-free totals consumed by Task 2 parity pins.

- [ ] **Step 1: Write failing test**

```ts
test("mobile grand total equals desktop formula (no GST)", async ({ page }) => {
  // fixed cart via mocks; assert displayed grand == metal + making − discount exactly, and no "GST" row text
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test e2e/mobile-sale-errors.spec.ts -g "no GST" 2>&1 | tail -8`
Expected: FAIL (GST row present / total includes 3%)

- [ ] **Step 3: Strip GST from mobile sale (UI row, drawer row, toggle delta, payload keys)**

Keep `subtotal = metal ± making`; grand = subtotal − discount. If any persisted invoice key stores GST amounts, set 0 / drop (verify against invoices schema first — read-only check, no migration).

- [ ] **Step 4: Update the old GST-aware exact-delta test to the desktop formula (keep exactness, change expectation)**

- [ ] **Step 5: Run GREEN + tsc + diff**

---

### Task 2: Unify loan interest (monthly girvi-%) + making source (live config)

**Files:**
- Modify: `src/components/gold-ledger/loan-drawer.tsx` (interest formula + default + label — read current `:62` area first)
- Modify: `src/pages/pos/mobile-pos.tsx` (making source: read live `making_charges` config like desktop `sale-form.tsx:365`; stored `purchase_making_charge_paise` becomes fallback only when config row absent)
- Modify: `e2e/mobile-sale-errors.spec.ts` (cross-form parity tests)
- Test: same spec file

**Interfaces:**
- Consumes: GST-free totals from Task 1.
- Produces: canonical conventions (documented in code comments).

- [ ] **Step 1: Write failing parity tests**

```ts
test("drawer vs loan-form interest identical for same inputs", async ({ page }) => {
  // P=100000, r=2, months=12 → both yield interest 24000, total 124000 (verify formula from mobile form docs first)
});
test("mobile making equals desktop making under same config", async ({ page }) => {
  // same piece + same making_charges mock → identical per-piece making on /sales/new vs desktop assertion path
});
```

- [ ] **Step 2: Run to verify they fail**

Expected: FAIL (drawer annual vs form monthly; stored vs config making)

- [ ] **Step 3: Unify drawer to monthly girvi-% (default 2, label `%/mo`, formula `round(P*r/100)*months`, total `P+interest`)**

Update drawer default 18→2, formula, and label (explicit `%/mo` so the unit is never ambiguous again). Mobile/new-page form already canonical — confirm unchanged.

- [ ] **Step 4: Point mobile making at live config with stored-cost fallback**

Read how `sale-form.tsx` queries `making_charges` (by purity/metal?) and mirror the lookup in `mobile-pos.tsx`; fallback to stored cost only when the config row is absent. Document precedence in a comment.

- [ ] **Step 5: Run GREEN + tsc + diff**

---

## Self-Review

1. **Coverage:** GST→T1 ✓; loan convention→T2 ✓; making source→T2 ✓.
2. **Steps:** each test names exact values; code steps name files + values.
3. **Types:** `user_id`, status `running`, paise-integer math consistent with prior tasks.
4. **Review Focus:** 4 modes pinned to T1/T2 tests above.
5. **Proportion:** decisions only, no transcripts.

## Rulings (owner-delegated senior-dev calls, India real-world)

- R1 GST: desktop (no GST) wins; mobile 3% removed. Rationale: single source of truth beats silent divergence; tax behavior change is owner-approved. Cost if wrong: bills miss tax that should apply — owner explicitly accepted desktop behavior.
- R2 Loan: monthly girvi-% canonical (default 2%/mo, simple interest). Rationale: local jewellery-shop gold loans are girvi-style monthly (banks quote annual, moneylenders/NBFCs quote 2–3%/mo); drawer annual-18 default (≈1.5%/mo) underprices vs shop norm. Cost if wrong: systematic under/over-interest vs market.
- R3 Making: live `making_charges` config canonical, stored cost fallback-only. Rationale: config is admin-editable live truth; stored cost freezes at purchase time. Cost if wrong: stale making prices on mobile.
