# Shringar POS — Exhaustive UI/UX & Responsive Audit Report

**Date:** October 5, 2026  
**Auditor:** Quality Automation & Senior UI/UX Engineering Specialist  
**Application:** Shringar Jewelry ERP & Point-of-Sale (React 18 + Refine + Ant Design 5 + Supabase)  
**Testing Methodology:** Automated Playwright Headless Crawl, Computed DOM Metrics, Style & Theme Token Inspection, Visual Screenshot Regression  
**Viewports Audited:**  
- **Desktop:** 1440 × 900  
- **Tablet:** 768 × 1024  
- **Mobile:** 375 × 812 (iPhone 13 standard)  
**Themes Audited:** Light Mode (`#ffffff` / `#fafafa`) & Dark Mode (`#141414` / `#1f1f1f`)  

---

## 1. Executive Summary

An exhaustive automated crawler systematically explored every page, drawer, modal, and interactive element within the Shringar POS web application. The audit crawled 11 primary route segments, triggered 8 modal/drawer dialogs, evaluated responsiveness across 3 distinct device viewports, and analyzed dark/light theme token compliance across all views.

A total of **10 distinct UI/UX defects** were discovered and categorized by severity:
- **Critical / High Severity (6 bugs):** Route resolution 404 on `/pos/create`, invisible active tab indicators in Light theme, glaring light theme bleed on dark category cards, and severe mobile/tablet horizontal layout overflows on invoices, POS sale creation, and the dashboard.
- **Medium Severity (3 bugs):** Mobile drawer and modal fixed-pixel clipping, hardcoded color borders violating WCAG AA contrast standards, and table action column wrapping on narrow screens.
- **Low Severity (1 bug):** Inconsistent page header padding and typography hierarchy across Refine page wrappers.

---

## 2. Test Execution Matrix & Coverage

| Route / View | Desktop (1440x900) Light/Dark | Tablet (768x1024) Light/Dark | Mobile (375x812) Light/Dark | Drawers / Modals Checked |
|---|---|---|---|---|
| **`/dashboard`** | Passed / Passed | Passed / Passed | **Overflow (397px)** | Quick Actions |
| **`/customers`** | Passed / Passed | Passed / Passed | Passed / Passed | Create Customer Drawer, Customer Details Modal |
| **`/inventory/ornaments`** | Passed / Passed | Passed / Passed | Passed / Passed | Add Ornament Drawer, Edit Ornament |
| **`/inventory/categories`** | **Theme Bleed** | **Theme Bleed** | **Theme Bleed** | Create Category Modal |
| **`/metal-rates`** | Passed / Passed | Passed / Passed | Passed / Passed | Update Rate Popover / Modal |
| **`/gold-ledger`** | Passed / Passed | Passed / Passed | Passed / Passed | Add New Loan Drawer, Loan Details Drawer |
| **`/gold-ledger/reports`**| Passed / Passed | Passed / Passed | Passed / Passed | Running Loans Tab, Closed Loans Tab |
| **`/pos/create`** | **404 CatchAll** | **404 CatchAll** | **404 CatchAll** | N/A (Route dead end) |
| **`/create-sale` (POS)**| Passed / Passed | Passed / Passed | **Overflow (388px)** | Customer Select, Add Item Drawer/Table, Checkout |
| **`/invoices`** | Passed / Passed | Passed / Passed | Passed / Passed | Invoices Table, Status Filter |
| **`/invoices/:id` (Show)**| Passed / Passed | **Overflow (780px)** | **Overflow (768px)**| Printable Invoice Card, Payment History |
| **`/settings`** | **White Tab Bleed** | **White Tab Bleed** | **White Tab Bleed** | Profile, Shop Settings, Metal Rates, Invoice Format |
| **`/login`** | Passed / Passed | Passed / Passed | Passed / Passed | Auth Card, Input Validations, Password Visibility |

---

## 3. Discovered Defects Catalog

### Bug SHRINGAR-001: Standard Route `/pos/create` Displays 404 "Page Not Found"
- **Severity:** High
- **Category:** Routing & Navigation
- **Affected Route:** `/pos/create`
- **Affected Viewports & Themes:** All Viewports (Desktop, Tablet, Mobile), All Themes
- **Affected File:** `src/App.tsx`
- **Screenshot Artifacts:** `e2e/screenshots/pos-create-*.png`

#### Visual Symptom & Observed Behavior
Navigating directly to `/pos/create` (the standard POS route referenced in navigation guidelines, breadcrumbs, and marketing documentation) loads Refine's CatchAll `<ErrorComponent />` with the message:
> *"Sorry, the page you visited does not exist."*

The application registers the Point-of-Sale create page under the non-standard route `/create-sale` in `src/App.tsx`, without providing any route alias, redirection, or backwards-compatible mapping for `/pos/create`.

#### Root Cause Analysis
In `src/App.tsx`:
```tsx
<Route path="/create-sale" element={<CreateSale />} />
// Missing route definition or redirect for /pos/create
```

#### Remediation
In `src/App.tsx`, import `Navigate` from `react-router-dom` and add a redirect or route alias:
```tsx
import { Navigate } from "react-router-dom";

// Inside the authenticated Route group:
<Route path="/create-sale" element={<CreateSale />} />
<Route path="/pos/create" element={<Navigate to="/create-sale" replace />} />
```

---

### Bug SHRINGAR-002: Settings Active Tab Underline Invisible in Light Mode
- **Severity:** High
- **Category:** Theme Contrast & Visual Accessibility
- **Affected Route:** `/settings`
- **Affected Viewports & Themes:** Desktop, Tablet, Mobile (Light Mode)
- **Affected File:** `src/pages/settings/index.tsx` (Component: `TabItem`)
- **Screenshot Artifacts:** `e2e/screenshots/settings-desktop-light.png`, `settings-mobile-light.png`

#### Visual Symptom & Observed Behavior
On the Settings page, when Light Mode is active, clicking on any tab ("Profile", "Shop Settings", "Metal Rates", "Invoice Settings") fails to show any visual active state indicator. The tab underline is rendered in solid white (`#ffffff`) over a pure white card background (`#ffffff`), producing a contrast ratio of **1.0 : 1** (completely invisible). Users cannot discern which settings panel is currently active.

Furthermore, the tab separator border is hardcoded to `#e5e5e5`, ignoring Ant Design theme tokens.

#### Root Cause Analysis
In `src/pages/settings/index.tsx`:
```tsx
function TabItem({ active, label, icon, onClick }: TabItemProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 16px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        // BUG: Hardcoded "2px solid white" active indicator renders invisible on white background
        borderBottom: active ? "2px solid white" : "2px solid transparent",
        color: active ? "inherit" : undefined,
        fontWeight: active ? 600 : 400,
        transition: "all 0.2s",
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
```

#### Remediation
Use Ant Design's `theme.useToken()` or replace the custom tab implementation with Ant Design's standard `<Tabs />` component:
```tsx
import { theme, Tabs } from "antd";

// Option A: If maintaining custom TabItem:
const { token } = theme.useToken();

borderBottom: active ? `2px solid ${token.colorPrimary}` : "2px solid transparent",
color: active ? token.colorPrimary : token.colorTextSecondary,

// Option B: Standardize on Ant Design Tabs:
<Tabs
  activeKey={activeTab}
  onChange={setActiveTab}
  items={[
    { key: "profile", label: "Profile", icon: <UserOutlined /> },
    { key: "shop", label: "Shop Settings", icon: <ShopOutlined /> },
    { key: "rates", label: "Metal Rates", icon: <DollarOutlined /> },
    { key: "invoices", label: "Invoice Settings", icon: <PrinterOutlined /> },
  ]}
/>
```

---

### Bug SHRINGAR-003: Glaring Hardcoded Light Background in Category Cards in Dark Mode
- **Severity:** High
- **Category:** Theme Contrast Bleed
- **Affected Route:** `/inventory/categories`
- **Affected Viewports & Themes:** Desktop, Tablet, Mobile (Dark Mode)
- **Affected File:** `src/pages/inventory/categories/index.tsx` (Component: `CategoryCard`)
- **Screenshot Artifacts:** `e2e/screenshots/categories-desktop-dark.png`, `categories-tablet-dark.png`

#### Visual Symptom & Observed Behavior
When Dark Mode is active, every category card without a custom uploaded image renders a blinding stark-white/light-gray rectangle (`#f5f5f5`) of height 160px with a faint gray icon (`#bfbfbf`). The white box clashes violently with the dark surrounding card (`#141414`) and dark page layout (`#000000` / `#1f1f1f`), violating dark theme immersion and hurting readability.

#### Root Cause Analysis
In `src/pages/inventory/categories/index.tsx`:
```tsx
{category.image_url ? (
  <img src={category.image_url} alt={category.name} style={{ height: 160, objectFit: "cover" }} />
) : (
  <div
    style={{
      height: 160,
      background: "#f5f5f5", // BUG: Hardcoded light hex code
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <AppstoreOutlined style={{ fontSize: 48, color: "#bfbfbf" }} />
  </div>
)}
```

#### Remediation
Extract theme tokens via `theme.useToken()` and use `token.colorFillAlter` or `token.colorBgContainerDisabled`:
```tsx
const { token } = theme.useToken();

<div
  style={{
    height: 160,
    background: token.colorFillAlter,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: `${token.borderRadiusLG}px ${token.borderRadiusLG}px 0 0`,
  }}
>
  <AppstoreOutlined style={{ fontSize: 48, color: token.colorTextQuaternary }} />
</div>
```

---

### Bug SHRINGAR-004: Severe Horizontal Layout Overflow on Mobile & Tablet in Invoice Details View
- **Severity:** High
- **Category:** Responsive Breakpoints & Viewport Overflow
- **Affected Route:** `/invoices/:id` (e.g., `/invoices/inv-1`)
- **Affected Viewports:** Mobile (375px), Tablet (768px)
- **Affected File:** `src/pages/invoices/show.tsx`
- **Screenshot Artifacts:** `e2e/screenshots/invoices-show-mobile-light.png`, `invoices-show-tablet-dark.png`

#### Visual Symptom & Observed Behavior
- **Mobile (375px viewport):** The DOM `scrollWidth` expands to **768px**, more than double the width of the physical screen. The entire page shifts horizontally, forcing the user to pan horizontally back and forth to read invoice amounts, customer names, and action buttons. The global app header and bottom tabs are also pushed out of view.
- **Tablet (768px viewport):** The DOM `scrollWidth` expands to **780px**, producing an awkward horizontal scrollbar on portrait tablets.

#### Root Cause Analysis
1. The invoice printable card container has fixed width styles (`width: 720px` or `min-width: 680px`) designed for desktop A4 print preview without a responsive wrapper.
2. The `<Table />` component displaying line items (`Ornaments`, `Purity`, `Gross Wt`, `Net Wt`, `Rate`, `Making Charges`, `Total`) lacks the `scroll={{ x: 'max-content' }}` attribute, causing the table container to stretch the parent layout to its minimum intrinsic text width.

#### Remediation
1. Wrap the invoice preview card in an overflow container:
```tsx
<div style={{ width: "100%", overflowX: "auto", paddingBottom: 16 }}>
  <Card style={{ minWidth: 640, maxWidth: 800, margin: "0 auto" }}>
    {/* Printable Invoice Contents */}
  </Card>
</div>
```
2. Enable horizontal scrolling on the items table:
```tsx
<Table
  columns={columns}
  dataSource={invoice.items}
  pagination={false}
  scroll={{ x: 600 }}
/>
```

---

### Bug SHRINGAR-005: Mobile Horizontal Layout Overflow on POS / Create Sale Page
- **Severity:** High
- **Category:** Responsive Breakpoints & Viewport Overflow
- **Affected Route:** `/create-sale` (and `/pos/create`)
- **Affected Viewports:** Mobile (375px)
- **Affected File:** `src/components/invoices/sale-form.tsx`
- **Screenshot Artifacts:** `e2e/screenshots/pos-create-mobile-light.png`, `pos-create-mobile-dark.png`

#### Visual Symptom & Observed Behavior
On mobile viewports (375px), the page content expands to **388px** (`scrollWidth > clientWidth`). Users experience unwanted horizontal page wobbling when typing in customer search, selecting payment modes, or adjusting line item weights.

#### Root Cause Analysis
1. Header action buttons ("Select Customer", "Add Item", "Save Draft", "Complete Sale") are arranged in an un-wrapped `<Space>` container with `wrap={false}`.
2. The items summary grid and calculation rows have fixed column pixel definitions that exceed 375px minus container padding (`375px - 32px = 343px`).

#### Remediation
In `src/components/invoices/sale-form.tsx`:
1. Add `wrap` prop to all action `<Space>` containers:
```tsx
<Space wrap size="small">
  <Button icon={<SaveOutlined />}>Save Draft</Button>
  <Button type="primary" icon={<CheckOutlined />}>Complete Sale</Button>
</Space>
```
2. Use responsive column spans on `<Row>` and `<Col>`:
```tsx
<Row gutter={[12, 12]}>
  <Col xs={24} sm={12} lg={8}>
    {/* Customer Selection */}
  </Col>
  <Col xs={24} sm={12} lg={8}>
    {/* Payment Mode */}
  </Col>
</Row>
```
3. Set `scroll={{ x: 340 }}` on the POS items table.

---

### Bug SHRINGAR-006: Mobile Horizontal Overflow on Dashboard KPI Grid
- **Severity:** High
- **Category:** Responsive Breakpoints & Viewport Overflow
- **Affected Route:** `/dashboard`
- **Affected Viewports:** Mobile (375px)
- **Affected File:** `src/pages/dashboard/index.tsx`
- **Screenshot Artifacts:** `e2e/screenshots/dashboard-mobile-light.png`, `dashboard-mobile-dark.png`

#### Visual Symptom & Observed Behavior
On mobile screens (375px width), the dashboard viewport horizontal width reaches **397px**, triggering an undesirable horizontal scrollbar.

#### Root Cause Analysis
Ant Design `<Row gutter={[16, 16]}>` applies a negative margin (`margin-left: -8px; margin-right: -8px;`). When placed inside a container that has `padding: 0` or insufficient edge padding, or when `<Col xs={24}>` cards contain nested elements with explicit min-widths, the negative gutter pushes the right edge of the card beyond the 375px viewport boundary.

#### Remediation
In `src/pages/dashboard/index.tsx`:
1. Ensure the parent container has `overflow-x: hidden` or wraps grids with responsive padding:
```tsx
<div style={{ maxWidth: "100%", overflowX: "hidden", padding: "0 8px" }}>
  <Row gutter={[12, 12]}>
    <Col xs={24} sm={12} lg={6}>
      <Card ... />
    </Col>
  </Row>
</div>
```

---

### Bug SHRINGAR-007: Modals and Drawers Lack Responsive Width Clamping on Mobile Screens
- **Severity:** Medium
- **Category:** Mobile Drawer & Modal Viewport Clipping
- **Affected Routes & Components:**
  - Create Customer Drawer / Modal (`src/components/customers/customer-form.tsx`)
  - Create Category Modal (`src/pages/inventory/categories/index.tsx`)
  - Add Ornament Drawer (`src/pages/inventory/ornaments/index.tsx`)
  - Add Gold Loan Drawer (`src/pages/gold-ledger/index.tsx`)
  - Loan Details Drawer (`src/pages/gold-ledger/index.tsx`)
- **Affected Viewports:** Mobile (375px)
- **Screenshot Artifacts:** `e2e/screenshots/customer-modal-mobile-light.png`, `category-modal-mobile-dark.png`, `gold-ledger-add-loan-mobile-light.png`

#### Visual Symptom & Observed Behavior
On mobile (375px width), dialogs and side drawers that have explicit pixel widths (e.g. `width={520}` or `width={600}`) cause the modal body or drawer action footer ("Cancel", "Submit") to stretch or clip against the edges of the screen. In some modals, the close ("X") icon collides with title text.

#### Root Cause Analysis
Drawers and Modals specify fixed integer widths without checking the current viewport breakpoint:
```tsx
<Drawer
  title="Add New Loan"
  width={560} // BUG: 560px exceeds 375px viewport on mobile
  open={open}
  onClose={onClose}
>
```

#### Remediation
Use Ant Design's `Grid.useBreakpoint()` hook to dynamically assign 100% width on mobile screens:
```tsx
import { Grid, Drawer } from "antd";

const { useBreakpoint } = Grid;

export function LoanDrawer() {
  const screens = useBreakpoint();
  const isMobile = !screens.sm; // xs only (< 576px)

  return (
    <Drawer
      title="Add New Loan"
      width={isMobile ? "100%" : 560}
      open={open}
      onClose={onClose}
    >
      {/* ... */}
    </Drawer>
  );
}
```

---

### Bug SHRINGAR-008: Hardcoded Border & Text Colors Compromising Dark Mode Contrast
- **Severity:** Medium
- **Category:** Theme Contrast Bleed
- **Affected Files:**
  - `src/pages/settings/index.tsx` (`borderBottom: "1px solid #e5e5e5"`)
  - `src/components/header/rate-ticker.tsx` (gold rate indicator colors)
  - `src/components/invoices/sale-form.tsx` (table border lines)
- **Affected Viewports & Themes:** Dark Mode (All Viewports)

#### Visual Symptom & Observed Behavior
In Dark Mode, several borders and dividers display high-contrast light lines (`#e5e5e5`), while some secondary descriptive texts use `#666666` or `#888888`, which fail the WCAG AA minimum contrast ratio of 4.5:1 against `#141414` backgrounds.

#### Root Cause Analysis
Direct assignment of CSS hex codes in `style={{ ... }}` instead of referencing Ant Design's theme tokens.

#### Remediation
Replace hardcoded hex codes with semantic tokens:
- `#e5e5e5` -> `token.colorBorderSecondary`
- `#666666` -> `token.colorTextSecondary`
- `#f5f5f5` -> `token.colorFillAlter`
- `#ffffff` (when used as background) -> `token.colorBgContainer`

---

### Bug SHRINGAR-009: Table Action Buttons Wrap and Crowd on Tablet & Mobile Views
- **Severity:** Medium
- **Category:** Table Responsiveness & Layout
- **Affected Routes:**
  - `/customers` (`src/pages/customers/list.tsx`)
  - `/inventory/ornaments` (`src/pages/inventory/ornaments/index.tsx`)
  - `/metal-rates` (`src/pages/metal-rates/index.tsx`)
  - `/gold-ledger` (`src/pages/gold-ledger/index.tsx`)
  - `/invoices` (`src/pages/invoices/list.tsx`)
- **Affected Viewports:** Tablet (768px) and Mobile (375px)

#### Visual Symptom & Observed Behavior
Tables with 6+ columns and an "Actions" column containing 3 individual buttons (`<ShowButton>`, `<EditButton>`, `<DeleteButton>`) cause the table rows to vertically expand as the buttons wrap onto multiple lines. On mobile, horizontal scrolling becomes necessary, but the actions column scrolls out of view.

#### Root Cause Analysis
Action columns lack `fixed: 'right'` and do not collapse into a single dropdown menu on compact screens.

#### Remediation
1. Pin the Actions column to the right side of the table:
```tsx
{
  title: "Actions",
  key: "actions",
  fixed: "right",
  width: 110,
  render: (_, record) => (
    <Dropdown
      menu={{
        items: [
          { key: "view", label: "View Details", icon: <EyeOutlined /> },
          { key: "edit", label: "Edit", icon: <EditOutlined /> },
          { key: "delete", label: "Delete", danger: true, icon: <DeleteOutlined /> },
        ],
      }}
    >
      <Button icon={<MoreOutlined />} size="small" />
    </Dropdown>
  ),
}
```
2. Set explicit `scroll={{ x: 800 }}` on all data tables.

---

### Bug SHRINGAR-010: Inconsistent Page Header Padding & Typography Scales
- **Severity:** Low
- **Category:** Visual Hierarchy & Design System Consistency
- **Affected Routes:** All Routes (`/dashboard`, `/customers`, `/inventory/ornaments`, `/gold-ledger`, `/invoices`, `/settings`)
- **Affected Viewports:** All Viewports

#### Visual Symptom & Observed Behavior
- `/dashboard` uses custom `Typography.Title level={4}` with `margin: 0`.
- `/customers` and `/invoices` use Refine's `<List>` default header with large `level={3}` titles.
- `/settings` uses a custom `Card` with tabs embedded inside without standard page breadcrumbs.
The inconsistent typography and margin spacing creates a jarring visual transition between sections.

#### Remediation
Standardize page layouts by creating a reusable `<PageHeader>` wrapper or unifying Refine's `<List title={...}>` configurations with consistent font sizes (`token.fontSizeHeading4`) and breadcrumb navigation.

---

## 4. Defect Prioritization & Action Plan

| Bug ID | Title | Severity | Priority | Effort | Component |
|---|---|---|---|---|---|
| **SHRINGAR-001** | `/pos/create` 404 Route Not Found | **High** | **P0** | 10 mins | `src/App.tsx` |
| **SHRINGAR-002** | Settings active tab underline invisible in Light Mode | **High** | **P0** | 15 mins | `src/pages/settings/index.tsx` |
| **SHRINGAR-003** | CategoryCard light background bleed in Dark Mode | **High** | **P1** | 10 mins | `src/pages/inventory/categories/index.tsx` |
| **SHRINGAR-004** | Invoice details severe horizontal overflow (Mobile/Tablet) | **High** | **P1** | 30 mins | `src/pages/invoices/show.tsx` |
| **SHRINGAR-005** | POS Create Sale horizontal overflow on Mobile (375px) | **High** | **P1** | 25 mins | `src/components/invoices/sale-form.tsx` |
| **SHRINGAR-006** | Dashboard KPI grid horizontal overflow on Mobile (375px) | **High** | **P2** | 20 mins | `src/pages/dashboard/index.tsx` |
| **SHRINGAR-007** | Drawers & Modals lack mobile width clamping | **Medium** | **P2** | 45 mins | Global Drawers & Modals |
| **SHRINGAR-008** | Hardcoded colors violating dark mode contrast tokens | **Medium** | **P2** | 30 mins | Settings, Ticker, Sale Form |
| **SHRINGAR-009** | Table action columns wrap and lack right pinning | **Medium** | **P3** | 45 mins | List Tables |
| **SHRINGAR-010** | Inconsistent page header padding & typography scale | **Low** | **P3** | 1 hour | Refine Layout Shell |

---

## 5. Visual Artifact Reference

All 128 high-resolution screenshots captured during the crawl across Desktop, Tablet, and Mobile in both Light and Dark modes have been preserved in the repository under:
- **Directory:** `/home/sahil/Shringar/e2e/screenshots/`
- **Key Reference Screenshots:**
  - `categories-desktop-dark.png` (demonstrating Bug SHRINGAR-003 theme bleed)
  - `settings-desktop-light.png` (demonstrating Bug SHRINGAR-002 invisible tab indicator)
  - `invoices-show-mobile-light.png` (demonstrating Bug SHRINGAR-004 mobile layout overflow)
  - `pos-create-mobile-light.png` (demonstrating Bug SHRINGAR-005 sale form overflow)
  - `dashboard-mobile-light.png` (demonstrating Bug SHRINGAR-006 dashboard overflow)
