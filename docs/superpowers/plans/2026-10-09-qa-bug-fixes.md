# Plan: End-to-End QA Bug Fixes

Fix all 13 bugs identified in the QA audit across Desktop and Mobile modes, test each fix with TypeScript compilation and browser verification, review the diffs, and commit each with conventional commit format (without coauthor).

---

## Tasks Overview

### Task 1: Fix Bug 1 — Silent Customer Assignment on Mobile POS Checkout
- **File:** `src/pages/pos/mobile-pos.tsx`
- **Issue:** In `handleCheckoutConfirm`, `const customerToUse = selectedCustomer || customers[0];` assigns checkout to `customers[0]` if none is chosen.
- **Fix:** If `!selectedCustomer`, show notification `Please select a customer before completing checkout` and return without creating invoice.
- **Commit:** `fix(pos): require explicit customer selection on mobile checkout`

### Task 2: Fix Bug 2 — Metal Rate Upsert Conflict Handling
- **Files:** `src/components/metal-rates/rate-edit-popover.tsx`, `src/components/dashboard/live-metal-rates-widget.tsx`, `src/components/layout/header.tsx`
- **Issue:** Updating metal rate executes an INSERT without upsert handling when `existingRate` is not matching today's record ID, triggering DB constraint `unique_metal_rate_date`.
- **Fix:** Update `RateEditPopover` to check if an existing rate for `rate_date` + `metal_type_id` exists, or use Supabase upsert with conflict target `shop_id,metal_type_id,rate_date` so rate saves cleanly.
- **Commit:** `fix(metal-rates): handle unique rate date constraint via upsert`

### Task 3: Fix Bug 3 — Invoice Cancellation Item Stock Restock Fetch Error
- **File:** `src/pages/invoices/index.tsx`
- **Issue:** When cancelling an invoice, subsequent loop over items to restock fails with `TypeError: Failed to fetch`.
- **Fix:** Properly query and update item stock using error-handled batch queries or Supabase client directly, ensuring cancellation state and restock complete gracefully.
- **Commit:** `fix(invoices): handle ornament stock restock robustly on invoice cancellation`

### Task 4: Fix Bug 4 — AntD Select Dropdown Overlay Click Interception
- **File:** `src/components/invoices/sale-form.tsx`
- **Issue:** `dropdownRender` renders a `<Button type="link">Create New Customer</Button>` and Divider that covers option items near the bottom of the list.
- **Fix:** Add a container with appropriate scrolling/padding or isolate the action button outside the menu viewport so it never covers options.
- **Commit:** `fix(pos): prevent select action button from overlaying dropdown items`

### Task 5: Fix Bug 5 — Mobile Invoice List False "UNPAID" Status Badge
- **File:** `src/components/invoices/mobile-invoice-list.tsx`
- **Issue:** Line 340 renders `inv.payment_status || "UNPAID"`. `invoices` table has no `payment_status` column, causing all invoices to render red UNPAID.
- **Fix:** Derive status dynamically: `const isPaid = (inv.balance_amount_paise ?? 0) <= 0;` and render `isPaid ? "PAID" : "PARTIAL"` with green/warning tag.
- **Commit:** `fix(invoices): derive payment status correctly on mobile invoice cards`

### Task 6: Fix Bug 6 — Customer Phone Format Validation Parity
- **File:** `src/components/customers/customer-modal.tsx`
- **Issue:** Desktop customer modal only checks required, allowing `12345`, whereas mobile form checks 10-digit regex.
- **Fix:** Add regex rule `/^[6-9]\d{9}$/` with message `Please enter a valid 10-digit phone number` in `CustomerModal`.
- **Commit:** `fix(customers): add 10-digit phone format validation to customer modal`

### Task 7: Fix Bug 7 — Desktop POS Payment Mode & Cash Tendered Support
- **File:** `src/components/invoices/sale-form.tsx`
- **Issue:** Desktop POS lacks payment method selection and change calculator present in Mobile POS.
- **Fix:** Add payment mode selector (Cash, UPI, Card, Net Banking) and cash change calculator to Desktop POS summary card.
- **Commit:** `feat(pos): add payment mode selector and cash change calculator to desktop POS`

### Task 8: Fix Bug 8 — Inventory Table Stock Increment Confirmation
- **File:** `src/pages/inventory/ornaments/index.tsx`
- **Issue:** Clicking `+` in the ornaments table instantly mutates DB inventory without confirmation.
- **Fix:** Wrap the `+` button in an Ant Design `<Popconfirm title="Increase stock by 1 pc?" ...>` to prevent accidental stock modifications.
- **Commit:** `fix(inventory): add popconfirm to table quantity increment button`

### Task 9: Fix Bug 9 — Prevent Duplicate Category Creation
- **Files:** `src/components/inventory/categories/category-modal.tsx`, `src/pages/inventory/categories/index.tsx`
- **Issue:** Category modal allows duplicate category names for the same shop.
- **Fix:** Add custom form validator in `CategoryModal` or `handleCreateFinish` checking against existing shop category names (case-insensitive) and showing error `A category with this name already exists`.
- **Commit:** `fix(categories): prevent creating duplicate category names in shop`

### Task 10: Fix Bug 10 — Gold Ledger Currency Fraction Formatting
- **File:** `src/pages/gold-ledger/index.tsx`
- **Issue:** Total column formats using `val.toLocaleString("en-IN")` without minimum 2 fraction digits, rendering `₹1,00,937.5`.
- **Fix:** Update formatting to `val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
- **Commit:** `fix(gold-ledger): format currency totals with two decimal places`

### Task 11: Fix Bug 11 — Design Gallery Album Count Text Collision & Pluralization
- **File:** `src/pages/design-gallery/index.tsx`
- **Issue:** Placeholder renders `{count} designs` (producing `"1 designs"`) and collides with corner tag badge.
- **Fix:** Only render placeholder text if `count === 0 ? "No photos yet" : null`, and fix pluralization check.
- **Commit:** `fix(design-gallery): fix album count pluralization and remove redundant label`

### Task 12: Fix Bug 12 & Bug 13 — Recharts Negative Dimension Warning & Mobile More Drawer Close Button
- **Files:** `src/components/dashboard/revenue-chart.tsx`, `src/components/mobile/more-menu-drawer.tsx`
- **Issue:** Recharts emits negative dimension console warnings; Mobile More drawer lacks an explicit close CTA.
- **Fix:** Ensure RevenueChart has explicit `minHeight: 280` container and mounts safely. Add an explicit close icon button at the top right of `MoreMenuDrawer`.
- **Commit:** `fix(ui): add close button to mobile more menu and fix recharts container dimensions`
