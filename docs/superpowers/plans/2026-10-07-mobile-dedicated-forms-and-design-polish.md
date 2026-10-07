# Mobile Dedicated Forms & Design Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal
Replace cramped desktop side drawers and modals on mobile screens with dedicated, smooth, full-screen mobile pages (e.g. `/ornaments/new`, `/ornaments/edit/:id`, `/customers/new`, and `/gold-ledger/new`) featuring high-end iOS/Android card layouts, live cost calculators, comfortable touch targets, zero horizontal overflow, followed by subagent screenshot reviews, UI iterations, and final git commit/push.

---

## Proposed Architecture & File Structure

1. **Routes & App Routing**:
   - `src/App.tsx`: Add dedicated routes under `/ornaments`:
     - `/ornaments/new` -> `OrnamentCreatePage`
     - `/ornaments/edit/:id` -> `OrnamentEditPage`
   - Add routes under `/customers`:
     - `/customers/new` -> `CustomerCreatePage`
   - Add routes under `/gold-ledger`:
     - `/gold-ledger/new` -> `GoldLoanCreatePage`

2. **Mobile Form Components**:
   - `src/pages/inventory/ornaments/mobile-ornament-form.tsx`:
     - Dedicated full-screen mobile page layout with sticky top app bar (`<ArrowLeft />`, title, "Save" action).
     - Sectioned Cards:
       - **Metal & Purity Card**: Segmented pills (Gold, Silver, Platinum, Diamond) with live color glow and 1-tap Karat chips (24K, 22K, 18K, 14K).
       - **Identity Card**: Name, SKU (with auto-generate toggle), Category select with quick inline add.
       - **Weight & Specs Card**: Gross weight, stone weight, wastage %, net weight live computation.
       - **Pricing & Rates Card**: Current rate preview, making charge type (fixed or per gram), dynamic total purchase cost badge.
       - **Stock & Media Card**: Quantity stepper, minimum alert threshold, image preview/upload.
     - Sticky bottom dock with 48px primary "Save to Inventory" CTA.
   - `src/pages/customers/mobile-customer-form.tsx`:
     - Full-screen mobile customer registration page with clean phone number formatting, WhatsApp validation, address, and GST/PAN fields.
   - `src/pages/gold-ledger/mobile-gold-loan-form.tsx`:
     - Full-screen mobile loan application page with customer picker, gold collateral weight, market valuation preview, loan amount, and monthly interest calculation.

3. **Mobile Screen Integration**:
   - `src/components/inventory/mobile-ornament-grid.tsx`:
     - Update "Add Item" button and card "Edit" buttons to navigate to `/ornaments/new` and `/ornaments/edit/${orn.id}` instead of opening desktop drawer.
   - `src/components/customers/mobile-customer-list.tsx`:
     - Update "Add Client" to navigate to `/customers/new` or full-screen view.
   - `src/components/gold-ledger/mobile-gold-ledger.tsx`:
     - Update "New Loan" to navigate to `/gold-ledger/new` or full-screen view.

4. **Testing, Screenshot Auditing & Subagent Reviews**:
   - `e2e/mobile-dedicated-forms.spec.ts`:
     - Playwright E2E tests verifying creation through dedicated mobile pages on Pixel 7 viewport (393x851).
     - Assert zero horizontal overflow (`scrollWidth <= clientWidth`).
     - Save screenshots for every screen.
   - Subagent Review:
     - Invoke research subagent to review each captured screenshot for native app aesthetic, ergonomics, and visual polish.
     - Implement all suggestions.

5. **Final Build & Push**:
   - Verify `pnpm run build` passes with zero errors.
   - Run `git add`, `git commit`, and `git push origin main`.

---

## Tasks

- [ ] **Task 1: Add Dedicated Routes in App.tsx & Page Scaffolding**
  - [ ] Add `/ornaments/new` and `/ornaments/edit/:id` routes in `src/App.tsx`.
  - [ ] Add `/customers/new` and `/gold-ledger/new` routes in `src/App.tsx`.
  - [ ] Create wrapper pages `src/pages/inventory/ornaments/create.tsx` and `src/pages/inventory/ornaments/edit.tsx`.
  - [ ] Verify routing compiles with `tsc`.

- [ ] **Task 2: Build Mobile Dedicated Ornament Form Component**
  - [ ] Create `src/pages/inventory/ornaments/mobile-ornament-form.tsx` with Refine's `useForm` and AntD `Form`.
  - [ ] Implement sectioned cards (Metal & Purity chips, Identity, Weight, Dynamic Pricing, Stock).
  - [ ] Add sticky header with back arrow & title, and sticky bottom CTA dock.
  - [ ] Update `src/components/inventory/mobile-ornament-grid.tsx` to navigate to `/ornaments/new` on "Add Item" and `/ornaments/edit/:id` on edit.

- [ ] **Task 3: Build Mobile Dedicated Customer & Loan Forms**
  - [ ] Create `src/pages/customers/mobile-customer-form.tsx` with clean touch cards.
  - [ ] Create `src/pages/gold-ledger/mobile-gold-loan-form.tsx` with collateral calculator.
  - [ ] Update mobile triggers in customer and gold-ledger lists to use the new dedicated screens.

- [ ] **Task 4: Write Playwright Test Suite & Capture Full Screenshots**
  - [ ] Create `e2e/mobile-dedicated-forms.spec.ts` testing navigation, inputs, calculations, and saves.
  - [ ] Assert `scrollWidth <= clientWidth` on all dedicated form pages.
  - [ ] Capture screenshots of all mobile pages into `test-results/`.

- [ ] **Task 5: Launch Subagent for Design Review & Apply Polish**
  - [ ] Invoke subagent to review screenshots and provide design critiques.
  - [ ] Apply styling refinements (smooth gradients, spacing, icons, typography).
  - [ ] Re-run tests to confirm all pass.

- [ ] **Task 6: Final Verification, Git Commit & Push**
  - [ ] Run `pnpm run build` to confirm 0 TypeScript / bundle errors.
  - [ ] Run full Playwright test suite to confirm 100% green.
  - [ ] Commit all changes with descriptive message and push to `origin main`.
