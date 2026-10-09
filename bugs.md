# Shringar POS — End-to-End QA Testing Bug Report

**Target URL:** `https://shringar-pos.vercel.app/`  
**Test Account:** `demo.kolhapur@shringar.com`  
**Shop Name:** Mahalaxmi Saraf & Jewellers (`MSJ`)  
**Test Devices & Viewports:**  
- **Desktop:** Viewport `1280 x 800`
- **Mobile:** Viewport `390 x 844` (iPhone 14 / modern smartphone standard)  
**Testing Methodology:** Raw browser session interaction via `agent-browser` (clicking, form filling, flow validation, console log & error inspection across all application modules).

---

## Executive Summary of Findings

During end-to-end testing across Dashboard, POS New Sale, Invoices, Customers, Ornaments Inventory, Categories, Gold Ledger, Metal Rates, Design Gallery, and Showroom Settings, a total of **13 bugs** were identified.

| Severity | Count | Summary of Key Issues |
| :--- | :---: | :--- |
| **Critical** | 1 | Silent customer account assignment on Mobile POS checkout |
| **High** | 2 | Unique constraint database crash on Metal Rate update; Invoice cancellation stock update failure |
| **Medium** | 5 | False UNPAID badge on mobile invoices; Desktop POS missing payment mode; AntD Select dropdown overlay interception; Instant stock mutation without confirmation; Duplicate categories allowed |
| **Low** | 5 | Inconsistent customer phone validation; Currency fraction formatting in Gold Ledger; Redundant pluralization collision in Design Gallery; Negative Recharts dimension warnings; Mobile More drawer missing close CTA |

---

## Detailed Bug Reports

### Bug 1: Silent Customer Assignment on Mobile POS Checkout
- **Severity:** `Critical`
- **Mode / Viewport:** `Mobile` (`390 x 844`)
- **Location:** `src/pages/pos/mobile-pos.tsx` (Lines 401–406)
- **Description:**
  When a cashier creates a sale and proceeds through checkout on the mobile POS view without explicitly selecting a customer, the application silently assigns the sale and invoice to `customers[0]` (the very first customer in the database query):
  ```typescript
  const customerToUse = selectedCustomer || customers[0];
  ```
  This creates a severe data corruption and privacy bug: sales, GST invoices, and financial liabilities are silently attached to random, uninvolved customer accounts.
- **Steps to Reproduce:**
  1. Set viewport to `390 x 844` and navigate to `https://shringar-pos.vercel.app/sales/new`.
  2. Tap on any ornament catalog item to add it to the cart dock.
  3. Tap **Review Cart** dock button.
  4. In the checkout drawer, leave the customer selector empty/unselected.
  5. Select payment mode (e.g. Cash) and tap **Generate Invoice**.
  6. Observe that the invoice is generated and permanently billed to an arbitrary existing customer (e.g. "Aniket Patil") without any warning or confirmation.
- **Expected Behavior:**
  Checkout should be blocked with a required validation error, or the cashier should be prompted to select a customer or create a designated "Walk-in Customer" record.

---

### Bug 2: Unique Metal Rate Date DB Constraint Crash on Rate Update
- **Severity:** `High`
- **Mode / Viewport:** `Both` (Desktop & Mobile)
- **Location:** `src/components/metal-rates/rate-edit-popover.tsx` (Lines 45–75), `src/components/dashboard/`, Header Ticker
- **Description:**
  In the top navigation header metal rates ticker button and Dashboard rate update buttons, opening the `RateEditPopover` to adjust today's Gold or Silver rate fails if `existingRate` is not preloaded in React state. The handler executes `createRate` (HTTP POST / INSERT) instead of an UPSERT. The Supabase table `ornament_rates` enforces:
  ```sql
  CONSTRAINT unique_metal_rate_date UNIQUE (shop_id, metal_type_id, rate_date)
  ```
  Postgres rejects the insertion with error `23505 duplicate key value violates unique constraint "unique_metal_rate_date"`, displaying a red error toast and leaving the rate unchanged.
- **Steps to Reproduce:**
  1. Log into `https://shringar-pos.vercel.app/` on Desktop or Mobile.
  2. In the top header bar, click/tap the live metal rate button (`GOLD ₹75,000 / 10g | SILVER ₹93 / g`).
  3. Enter a new Gold rate (e.g. `75500`) and click **Save**.
  4. Observe error notification: `duplicate key value violates unique constraint "unique_metal_rate_date"`.
- **Expected Behavior:**
  Rate mutations should perform an `upsert` with conflict target `(shop_id, metal_type_id, rate_date)` so existing rates for the current date are updated seamlessly.

---

### Bug 3: Invoice Cancellation Item Stock Restock Fetch Error
- **Severity:** `High`
- **Mode / Viewport:** `Both` (Desktop & Mobile)
- **Location:** `src/pages/invoices/index.tsx` (Lines 204–245)
- **Description:**
  When cancelling an invoice from `/invoices` (via the "Cancel Invoice" action button and modal confirmation), the Supabase invoice status update succeeds (`is_cancelled = true`), but the subsequent client-side loop attempting to restore ornament stock quantities fails with:
  ```text
  TypeError: Failed to fetch
  ```
  The user is shown an error notification, and inventory quantities are not properly restored for the cancelled line items.
- **Steps to Reproduce:**
  1. Navigate to `https://shringar-pos.vercel.app/invoices`.
  2. Locate an active invoice and click the **Cancel** button in the actions column.
  3. Enter a cancellation reason (e.g. "Customer return") and click **Confirm Cancellation**.
  4. Observe error toast `TypeError: Failed to fetch`.
- **Expected Behavior:**
  Cancellation and stock replenishment should execute atomically via a Postgres RPC function or robust batch mutation, updating invoice status and ornament stock together without fetch errors.

---

### Bug 4: Ant Design Select Dropdown Overlay Click Interception
- **Severity:** `Medium`
- **Mode / Viewport:** `Desktop` (`1280 x 800`)
- **Location:** `src/components/invoices/sale-form.tsx` (Lines 780–798)
- **Description:**
  In the Customer and Ornament selection dropdowns on the Desktop POS form, `dropdownRender` injects a bottom `<Divider />` and `<Button type="link">Create New Customer</Button>`. In compact viewports (or when the dropdown menu expands downwards near the lower fold), the sticky link button overlaps the bottom options in the listbox. Clicks intended for the bottom option item trigger the "Create New Customer" action instead of selecting the customer.
- **Steps to Reproduce:**
  1. On desktop (1280x800), navigate to `https://shringar-pos.vercel.app/sales/new`.
  2. Click the Customer `<Select>` dropdown to show customer items.
  3. Attempt to click on the last visible customer item near the bottom divider.
  4. Notice the click is intercepted by the "Create New Customer" link button, opening the customer creation modal instead of selecting the customer.
- **Expected Behavior:**
  The dropdown menu listbox should have sufficient bottom padding or the action button should be placed outside the scroll container to prevent click overlay issues.

---

### Bug 5: Mobile Invoice List Shows False "UNPAID" Badge on Settled Invoices
- **Severity:** `Medium`
- **Mode / Viewport:** `Mobile` (`390 x 844`)
- **Location:** `src/components/invoices/mobile-invoice-list.tsx` (Line 340)
- **Description:**
  In the mobile invoice list view, each invoice card header renders:
  ```tsx
  <Badge text={inv.payment_status || "UNPAID"} status="error" />
  ```
  The Supabase `invoices` table does not contain a `payment_status` column. Consequently, `inv.payment_status` is always `undefined`, causing **every single invoice** to display a red `UNPAID` badge, even when the invoice has zero balance and is displayed as "Paid" elsewhere.
- **Steps to Reproduce:**
  1. Set viewport to `390 x 844` and navigate to `https://shringar-pos.vercel.app/invoices`.
  2. Inspect any settled invoice card (e.g. `#MSJ000030`).
  3. Observe that the top-right tag says `Paid`, but the header badge simultaneously displays a red `UNPAID` status.
- **Expected Behavior:**
  Payment status badge should derive its value dynamically:
  ```tsx
  const isPaid = (inv.balance_amount_paise ?? 0) <= 0;
  <Badge text={isPaid ? "PAID" : "UNPAID"} status={isPaid ? "success" : "error"} />
  ```

---

### Bug 6: Inconsistent Customer Phone Format Validation Between Desktop and Mobile
- **Severity:** `Medium`
- **Mode / Viewport:** `Both` (Desktop vs Mobile)
- **Location:** `src/components/customers/customer-modal.tsx` (Line 186) vs `src/pages/customers/mobile-customer-form.tsx` (Line 221)
- **Description:**
  Desktop `CustomerModal` only checks `{ required: true, message: "Phone number is required" }`, allowing cashiers to submit invalid phone numbers like `12345` or `000`. Conversely, `mobile-customer-form.tsx` validates against a 10-digit Indian phone regex (`Please enter a valid phone number`). This inconsistency allows malformed phone records to enter the database via desktop.
- **Steps to Reproduce:**
  1. On Desktop (`1280 x 800`), go to `/customers` and click **New Customer**.
  2. Enter Name: `QA Test`, Phone: `12345`, Address: `Test Address`.
  3. Click **Save**. Form submits successfully and creates the customer.
  4. Now switch to Mobile (`390 x 844`), go to `/customers/new`, and enter Phone: `12345`.
  5. Click **Add Client**. Form blocks submission with error: `Please enter a valid phone number`.
- **Expected Behavior:**
  Apply the standard 10-digit regex validator (`/^[6-9]\d{9}$/`) uniformly across both Desktop and Mobile customer creation forms.

---

### Bug 7: Desktop POS Missing Payment Mode Selector (Feature Disparity)
- **Severity:** `Medium`
- **Mode / Viewport:** `Desktop` (`1280 x 800`)
- **Location:** `src/components/invoices/sale-form.tsx` vs `src/pages/pos/mobile-pos.tsx`
- **Description:**
  Mobile POS includes payment method selection (Cash, UPI, Card, Bank Transfer) with cash tendered input and real-time change calculation. On Desktop POS (`sale-form.tsx`), there is no Payment Mode selector or cash tendered input at all.
- **Steps to Reproduce:**
  1. Compare `/sales/new` on Desktop (1280x800) vs Mobile (390x844).
  2. Mobile has a dedicated payment options segmented control and cash change calculator.
  3. Desktop invoice summary card only displays Subtotal, Making Charges, GST, and Total with two "Save Invoice" buttons and zero payment mode selection.
- **Expected Behavior:**
  Desktop POS should include payment mode options (Cash, UPI, Card, Net Banking) and cash change calculations to match Mobile POS capabilities.

---

### Bug 8: Instant Inventory Quantity Mutation Without Confirmation
- **Severity:** `Medium`
- **Mode / Viewport:** `Desktop` (`1280 x 800`)
- **Location:** `src/pages/inventory/ornaments/index.tsx` (Lines 685–715)
- **Description:**
  In the ornaments inventory table, the "Qty" column contains a small `+` icon button next to the quantity count. Clicking this button immediately triggers a database update (`updateOrnament`) incrementing the inventory by 1 without any confirmation modal, popconfirm, or decrement (`-`) button to reverse accidental clicks. A misclick in the table immediately corrupts stock counts.
- **Steps to Reproduce:**
  1. Navigate to `https://shringar-pos.vercel.app/ornaments` on Desktop.
  2. Click the tiny `+` button in the "Qty" column for any ornament.
  3. Notice the quantity immediately increments in the database without any confirmation dialog. If clicked by mistake, the user cannot decrement it without opening the full edit form.
- **Expected Behavior:**
  Wrap stock modifications in an Ant Design `<Popconfirm>` or provide both increment and decrement controls with stock modification reason tracking.

---

### Bug 9: Duplicate Category Names Allowed Without Validation or DB Constraint
- **Severity:** `Medium`
- **Mode / Viewport:** `Both` (Desktop & Mobile)
- **Location:** `src/components/inventory/categories/category-modal.tsx` & `supabase/migrations/20261005130036_init_schema.sql` (Line 72)
- **Description:**
  The system allows creating multiple categories with the exact same name within the same shop. The database table `ornament_categories` lacks a unique constraint on `(shop_id, lower(name))`, and the frontend form has no uniqueness validation. This leads to duplicate categories appearing in POS dropdowns and inventory filters.
- **Steps to Reproduce:**
  1. Navigate to `https://shringar-pos.vercel.app/categories`.
  2. Click **New Category**.
  3. Enter Name: `Thushi & Chokers` (which already exists in the shop).
  4. Click **Save**.
  5. The category is created, resulting in two identical "Thushi & Chokers" categories in the list.
- **Expected Behavior:**
  Add a unique constraint on `(shop_id, lower(name))` in the database and validate against existing category names in the category modal.

---

### Bug 10: Inconsistent Currency Decimal Formatting in Gold Ledger
- **Severity:** `Low`
- **Mode / Viewport:** `Desktop` (`1280 x 800`)
- **Location:** `src/pages/gold-ledger/index.tsx` (Line 563)
- **Description:**
  In the Gold Ledger table, the `Total` column renders amounts using `val.toLocaleString("en-IN")` without specifying `minimumFractionDigits: 2`. For loans with fractional interest calculations (such as Sanjay Balasaheb Jadhav's loan), it renders as `₹1,00,937.5` instead of `₹1,00,937.50`.
- **Steps to Reproduce:**
  1. Navigate to `https://shringar-pos.vercel.app/gold-ledger`.
  2. Locate the row for "Sanjay Balasaheb Jadhav".
  3. Look at the Total column: it displays `₹1,00,937.5` with a dangling single decimal digit.
- **Expected Behavior:**
  Format financial amounts with `minimumFractionDigits: 2` and `maximumFractionDigits: 2`:
  ```tsx
  ₹{Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  ```

---

### Bug 11: Design Gallery Album Count Redundancy and Pluralization Glitch
- **Severity:** `Low`
- **Mode / Viewport:** `Both` (Desktop & Mobile)
- **Location:** `src/pages/design-gallery/index.tsx` (Lines 312–333)
- **Description:**
  When an album card has no cover photo, the placeholder text renders `{count} designs` (producing `"1 designs"` for single-item albums), while the top-right Tag badge simultaneously renders `{count} design`. The two labels collide into `"1 designs1 design"` in accessibility trees and text parsers.
- **Steps to Reproduce:**
  1. Navigate to `https://shringar-pos.vercel.app/design-gallery`.
  2. Inspect an album without a cover image with 1 design (e.g. "Mangalsutra & Pendants").
  3. Observe text inside the card: `"1 designs1 design"`.
- **Expected Behavior:**
  Fix the pluralization ternary check (`count === 1 ? "1 design" : `${count} designs``) and avoid rendering duplicate count labels in both the placeholder and the corner badge.

---

### Bug 12: Recharts Negative Dimension Console Warnings on Dashboard
- **Severity:** `Low`
- **Mode / Viewport:** `Desktop` (`1280 x 800`)
- **Location:** `src/components/dashboard/revenue-chart.tsx`
- **Description:**
  Upon loading the Dashboard, Recharts outputs console warnings before flex/grid container dimensions are computed:
  ```text
  The width(-1) and height(-1) of chart should be greater than 0, please check the container's state.
  ```
- **Steps to Reproduce:**
  1. Open DevTools console and navigate to `https://shringar-pos.vercel.app/dashboard`.
  2. Notice the Recharts dimension warnings emitted during initial layout calculation.
- **Expected Behavior:**
  Set an explicit container `minHeight` or defer chart rendering until after client mount.

---

### Bug 13: Mobile MoreMenuDrawer Missing Close Action Button
- **Severity:** `Low`
- **Mode / Viewport:** `Mobile` (`390 x 844`)
- **Location:** `src/components/mobile/more-menu-drawer.tsx` (Lines 105–115)
- **Description:**
  The mobile bottom drawer ("More" menu) explicitly hides the drawer header (`header: { display: "none" }`) and lacks a dedicated close ("X") button or dismiss handle. Users who do not intuitively know to tap the dim backdrop or swipe away are trapped inside the drawer.
- **Steps to Reproduce:**
  1. In mobile mode (`390 x 844`), tap the **More** button in the bottom navigation bar.
  2. The drawer slides up covering the screen.
  3. Notice there is no Close button, Back icon, or "Done" CTA inside the drawer.
- **Expected Behavior:**
  Include a visible close button or drag handle at the top of `MoreMenuDrawer`.

---

## Test Execution Summary Matrix

| Page / Route | Desktop Tested | Mobile Tested | Status / Observations |
| :--- | :---: | :---: | :--- |
| `/dashboard` | Yes | Yes | Metric cards, quick actions, and revenue range switching work; negative chart dimension warning noted. |
| `/sales/new` (POS) | Yes | Yes | Mobile silently assigns customer; Desktop POS missing payment mode selector; AntD select click overlay. |
| `/invoices` | Yes | Yes | Desktop cancel invoice triggers fetch error; Mobile cards display false UNPAID status badge. |
| `/customers` | Yes | Yes | List, search, pagination, drawer work; Phone validation missing on Desktop modal vs Mobile form. |
| `/ornaments` | Yes | Yes | Filters, table sorting, drawer create work; Table Qty `+` button mutates stock without confirmation. |
| `/categories` | Yes | Yes | Card grid and mobile rows work; Duplicate category names permitted without constraint. |
| `/gold-ledger` | Yes | Yes | Loans list, filters, and drawer work; Total amount column has inconsistent decimal formatting. |
| `/metal-rates` | Yes | Yes | Rate history table and charts work; Rate edit from header ticker crashes due to unique date constraint. |
| `/design-gallery` | Yes | Yes | Albums grid, album detail, and presentation modal work; Placeholder text collision `"1 designs1 design"`. |
| `/settings` | Yes | Yes | Making charges steppers and Shop profile settings work across desktop and mobile. |
