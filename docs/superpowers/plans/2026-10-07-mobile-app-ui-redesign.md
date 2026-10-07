# Mobile App-First UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Shringar POS web application into a first-class native mobile app experience on mobile viewports while preserving standard desktop layouts on larger screens.

**Architecture:** Implement an adaptive layout architecture. On mobile viewports (< 768px), replace sidebar navigation with a native-style sticky Top App Bar and a Bottom Tab Bar with haptic-styled quick tabs and a "More" drawer. Replace wide desktop tables with compact touch cards, action sheets, and thumb-friendly controls. Maintain zero breaking changes for desktop users via CSS media queries, responsive Ant Design hooks (`useBreakpoint`), and mobile layout wrappers.

**Tech Stack:** React 18, Vite, Refine Dev, Ant Design v5 (with Design Tokens & `useBreakpoint`), Lucide React icons, Tailwind CSS / Vanilla CSS safe-area variables, Playwright (for automated mobile viewport screenshotting and validation).

**Spec:** Responsive Native-Feel Mobile App Mode across all core routes:
1. Navigation Shell: Top App Header + Bottom Tab Bar + "More" Sheet
2. Auth Flow: Mobile sheet/card styling for `/login`, `/register`, `/create-account`, `/approve-access`
3. Onboarding: Step-by-step native card flow for `/setup`
4. Core POS & Sales: Sticky mobile cart footer, touch barcode/search, quick-add cards
5. Records & Ledgers: Invoices, Customers, Gold Ledger transformed from desktop tables into mobile cards with quick tap actions
6. Inventory & Rates: Mobile ornament cards, metal rate tickers, design albums
7. Settings: iOS/Android style grouped list views

## Global Constraints
- Desktop viewports (>= 768px) must retain their existing desktop sidebar and layout without regressions.
- Mobile viewports (< 768px) must feel like a native mobile app: comfortable touch targets (minimum 44px), legible typography (12-16px, no horizontal overflows), bottom navigation dock, and safe-area insets (`env(safe-area-inset-bottom)`).
- Subagent driven: Each task must be verified with Playwright mobile emulation (iPhone 14 / Pixel 7 viewports) and inspected with screenshots.
- Do NOT commit or push to GitHub until the user explicitly requests at the very end.

## Review Focus
1. **Horizontal Scroll Prevention:** No mobile page or modal should cause horizontal scrollbars or cut-off content on 360px–430px screens.
2. **Bottom Bar Obscuring Content:** Content at the bottom of pages must have bottom padding (`pb-20` or safe padding) so sticky bottom navigation or cart action bars do not cover text or buttons.
3. **Form Input Zoom on iOS:** Form inputs must have minimum font-size 16px on mobile viewports to prevent iOS Safari auto-zoom behavior.
4. **Touch Ergonomics:** Primary buttons, tabs, and action icons must have touch target sizes of at least 44x44px.
5. **Back & Deep Navigation:** Sub-routes (e.g. `/invoices/show/:id`, `/sales/new`) must feature an easy mobile top-left back button.

---

### Task 1: Mobile App Shell with Top Bar, Bottom Tab Bar, and "More" Menu

**Files:**
- Create: `src/components/mobile/mobile-shell.tsx`
- Create: `src/components/mobile/bottom-nav-bar.tsx`
- Create: `src/components/mobile/more-menu-drawer.tsx`
- Modify: `src/App.tsx`
- Test: `tests/mobile-shell.spec.ts`

**Interfaces:**
- Produces: `<MobileShell />`, `<BottomNavBar />`, `<MoreMenuDrawer />`
- Consumes: Refine `useNavigation`, Ant Design `theme.useToken`, `Grid.useBreakpoint`

- [ ] **Step 1: Write Playwright test for mobile shell navigation**
Verify that on a 390x844 viewport:
- The bottom navigation dock renders with 5 tabs: Dashboard, POS, Invoices, Gold, and More.
- Tapping tabs navigates correctly.
- Tapping "More" opens the mobile bottom drawer with links to Customers, Ornaments, Categories, Rates, Gallery, Settings.
- On desktop (1280x800), the bottom bar is hidden and desktop sidebar is visible.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test:mobile tests/mobile-shell.spec.ts`
Expected: FAIL (components do not exist yet)

- [ ] **Step 3: Implement Mobile Navigation Shell**
- Implement `src/components/mobile/bottom-nav-bar.tsx` with iOS safe-area inset, active tab highlighting, and badge indicators.
- Implement `src/components/mobile/more-menu-drawer.tsx` with clean app-style list items.
- Implement `src/components/mobile/mobile-shell.tsx` that switches between desktop `ThemedLayout` and mobile app shell dynamically using Ant Design `Grid.useBreakpoint()`.
- Update `src/App.tsx` to wrap authenticated pages with `<MobileShell />`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm test:mobile tests/mobile-shell.spec.ts`
Expected: PASS

---

### Task 2: Mobile Auth & Gatekeeper UI Experience

**Files:**
- Modify: `src/pages/auth/request-access.tsx`
- Modify: `src/pages/auth/create-account.tsx`
- Modify: `src/pages/auth/approve-access.tsx`
- Modify: `src/App.tsx` (Login page authPage props/styles)
- Test: `tests/mobile-auth.spec.ts`

**Interfaces:**
- Consumes: Supabase client, Ant Design tokens
- Produces: Mobile-app styled auth card containers with edge-to-edge mobile feel, 16px input fonts (anti-zoom), and large primary touch buttons.

- [ ] **Step 1: Write Playwright test for mobile auth routes**
Verify `/login`, `/register`, `/create-account`, and `/approve-access` render full height on mobile with 0 horizontal overflow and touch-friendly buttons.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test:mobile tests/mobile-auth.spec.ts`
Expected: FAIL / baseline discrepancies.

- [ ] **Step 3: Implement mobile-first styles for Auth Pages**
- Adapt login page container for mobile viewports (full height, mobile bottom actions).
- Enhance `request-access.tsx` and `create-account.tsx` with app-like header, compact inputs, and native keypad types (`inputMode="email"`, `inputMode="numeric"`).
- Enhance `approve-access.tsx` for one-tap gatekeeper action on phones.

- [ ] **Step 4: Run test and capture mobile screenshots**
Run Playwright mobile check and take screenshot artifacts for review.

---

### Task 3: Mobile Dashboard (`/`, `/dashboard`)

**Files:**
- Create: `src/components/dashboard/mobile-dashboard.tsx`
- Modify: `src/pages/dashboard/index.tsx`
- Test: `tests/mobile-dashboard.spec.ts`

**Interfaces:**
- Consumes: Dashboard metrics data, `useShopCheck`, live metal rates widget
- Produces: Mobile app dashboard with:
  - Header with Greeting, Shop Name, and live Gold/Silver rate pill
  - 2x2 compact KPI cards (Today's Sales, Invoices, Active Loans, Customers)
  - Quick Action circular buttons (New Sale, Add Customer, Gold Loan, Check Rates)
  - Recent Transactions card list with swipe/tap to view

- [ ] **Step 1: Write Playwright test for mobile dashboard**
Verify KPI cards, quick action buttons, and recent invoice list render without table overflow.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test:mobile tests/mobile-dashboard.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement `MobileDashboard` component**
Render `MobileDashboard` when viewport is mobile (`!screens.md`), otherwise render standard desktop dashboard.

- [ ] **Step 4: Run test and capture mobile screenshot**
Verify cleanly formatted mobile dashboard screenshot.

---

### Task 4: Mobile POS / New Sale Experience (`/sales/new`)

**Files:**
- Create: `src/pages/pos/mobile-pos.tsx`
- Modify: `src/pages/pos/index.tsx`
- Test: `tests/mobile-pos.spec.ts`

**Interfaces:**
- Consumes: Ornament search, Customer selector, Cart state, Invoice creation hook
- Produces: App-first POS interface:
  - Sticky search & category filter pills at top
  - Ornament item cards with one-tap add and quantity stepper
  - Sticky bottom cart bar ("3 items • ₹1,45,200 | Checkout ->")
  - Full-screen checkout sheet / drawer for payment, customer, and discounts

- [ ] **Step 1: Write Playwright test for mobile POS**
Verify product search, cart addition, sticky footer summary, and checkout drawer on 390px width.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test:mobile tests/mobile-pos.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement `MobilePOS`**
Create mobile touch-optimized POS workflow.

- [ ] **Step 4: Run test and capture mobile screenshot**
Verify seamless mobile sale creation.

---

### Task 5: Mobile Invoices & Receipts (`/invoices`, `/invoices/show/:id`, `/invoices/edit/:id`)

**Files:**
- Create: `src/components/invoices/mobile-invoice-list.tsx`
- Create: `src/components/invoices/mobile-invoice-card.tsx`
- Modify: `src/pages/invoices/index.tsx`
- Modify: `src/pages/invoices/show.tsx`
- Test: `tests/mobile-invoices.spec.ts`

**Interfaces:**
- Consumes: Invoices resource query, search & date filters
- Produces: Mobile invoice cards with invoice number, customer name, total amount, status badge (Paid / Pending), WhatsApp share button, and print PDF trigger.

- [ ] **Step 1: Write Playwright test for mobile invoices**
Verify invoice cards render cleanly, filters work via bottom sheet, and show/print drawer opens smoothly.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test:mobile tests/mobile-invoices.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement Mobile Invoice List & Details View**
Replace Ant Design Table with responsive card list on mobile. Add bottom-sheet filter drawer.

- [ ] **Step 4: Run test and verify screenshots**

---

### Task 6: Mobile Gold Ledger (`/gold-ledger`)

**Files:**
- Create: `src/components/gold-ledger/mobile-gold-ledger.tsx`
- Modify: `src/pages/gold-ledger/index.tsx`
- Test: `tests/mobile-gold-ledger.spec.ts`

**Interfaces:**
- Consumes: Loan records, interest calculator, settlement actions
- Produces: Mobile loan cards with customer badge, gold weight, principal, interest due, and quick action buttons (Collect Interest, Close Loan, Call Customer).

- [ ] **Step 1: Write Playwright test for mobile gold ledger**
Verify loan cards, filter tabs (Active, Closed, Overdue), and quick repayment actions.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test:mobile tests/mobile-gold-ledger.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement `MobileGoldLedger`**
Implement mobile card-based gold ledger and quick interest collection sheet.

- [ ] **Step 4: Run test and capture mobile screenshot**

---

### Task 7: Mobile Customers & Inventory (`/customers`, `/ornaments`, `/metal-rates`, `/design-gallery`)

**Files:**
- Create: `src/components/customers/mobile-customer-list.tsx`
- Create: `src/components/inventory/mobile-ornament-grid.tsx`
- Modify: `src/pages/customers/index.tsx`
- Modify: `src/pages/inventory/ornaments/index.tsx`
- Modify: `src/pages/metal-rates/index.tsx`
- Modify: `src/pages/design-gallery/index.tsx`
- Test: `tests/mobile-inventory-customers.spec.ts`

**Interfaces:**
- Consumes: Customer query, Ornament inventory query, Metal rates live data
- Produces: Touch-friendly customer cards with direct call (`tel:`) action, ornament photo cards with purity & weight badges, and metal rates mobile ticker cards.

- [ ] **Step 1: Write Playwright test for mobile customers & inventory**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement mobile customer cards & inventory grid**
- [ ] **Step 4: Run test and capture mobile screenshots**

---

### Task 8: Mobile Settings (`/settings`)

**Files:**
- Modify: `src/pages/settings/index.tsx`
- Modify: `src/components/settings/access-requests-settings.tsx`
- Test: `tests/mobile-settings.spec.ts`

**Interfaces:**
- Consumes: Shop profile form, access requests table, user settings
- Produces: iOS/Android style grouped settings list (Account, Shop Profile, Access Requests, Security).

- [ ] **Step 1: Write Playwright test for mobile settings**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement mobile grouped settings UI**
- [ ] **Step 4: Run test and capture mobile screenshot**

---

### Task 9: Comprehensive Subagent Visual Review & Iterative Polish

**Files:**
- Create: `scripts/capture-mobile-audit.ts`
- Artifacts: Screenshot audit of all 10 core pages in iPhone 14 & Pixel 7 mobile viewports.

**Interfaces:**
- Consumes: All updated pages
- Produces: Visual critique report via dedicated subagents for UI fidelity, touch targets, and typography consistency.

- [ ] **Step 1: Run complete mobile screenshot audit script across all routes**
- [ ] **Step 2: Dispatch subagent to review screenshots for true mobile app feel (contrast, font sizes, alignment, padding)**
- [ ] **Step 3: Apply any fine-tuning polish based on visual inspection**
- [ ] **Step 4: Final verification and ready for user review** (Hold commit and push until requested by user).
