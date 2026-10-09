# Shringar POS — Mobile + Desktop UI Audit Spec (2026-10-08)

Source: live sweep of https://shringar-pos.vercel.app (login demo.kolhapur@shringar.com),
48 Playwright screenshots (16 routes × mobile 390×844, dell-small 1366×768, hp-big 1920×1080)
in /tmp/opencode/ui-sweep/ + manifest.json. Reviewed by 3 design agents + 1 functional QA agent.
Document-level horizontal overflow: none on any viewport (all `scrollWidth == clientWidth`).
All inner-overflow / touch / routing defects below are real, with exact file:line root causes.

## Routes covered
/login, / (dashboard-root), /dashboard, /sales/new, /customers, /customers/new,
/ornaments, /ornaments/new, /categories, /metal-rates, /gold-ledger, /gold-ledger/new,
/gold-ledger/reports, /design-gallery, /invoices, /settings.

## Mobile (390×844) — 12 issues
1. Critical — Gold Ledger Reports renders desktop Table (`Running L…`, clipped cols).
   `src/pages/gold-ledger/reports.tsx:177-182` `scroll={{ x: 1200 }}` too wide for ~358px column.
2. Critical — Metal-rates history table clipped (`₹90.5 / g` cut).
   `src/components/metal-rates/rate-history-table.tsx:72` `scroll={{ x: 450 }}`.
3. Critical — Categories desktop toolbar (search `width:220` + small Radio.Group) + 160px empty covers.
   `src/pages/inventory/categories/index.tsx:216,229-234,315-317`.
4. Critical — POS 2-col grid clipped (`Heritage Be…`), 32px Add buttons.
   `src/pages/pos/mobile-pos.tsx:729-734` (no minmax/minWidth:0), `:785-792` Add 32px, `:568-570` pills 36px.
5. High — Invoice triple-action row crammed, 34px targets.
   `src/components/invoices/mobile-invoice-list.tsx:379-405` actions 34px, `:196-197` chips 38px.
6. High — Gold-ledger 34px actions + wrapping `Due:` line.
   `src/components/gold-ledger/mobile-gold-ledger.tsx:457-459,479-558`.
7. High — Gold-ledger 4-tab segmented bar squeezes labels.
   `src/components/gold-ledger/mobile-gold-ledger.tsx:266-293` flex:1 squeeze, no scroll.
8. High — Customers 36px targets + nested sticky search vs shell sticky header.
   `src/components/customers/mobile-customer-list.tsx:103,146-152,299-403`.
9. High — Rate Trend chart `Card extra` overflows (`R…` chip).
   `src/components/metal-rates/rate-chart.tsx:80-105` two Radio.Groups inside `extra`.
10. Medium — Design Gallery header doesn't stack (150px search beside Create Album) + error toast.
    `src/pages/design-gallery/index.tsx:162-169`.
11. Medium — Fixed translucent form docks obscure fields mid-scroll (customers/ornaments/loan new).
    `src/pages/customers/mobile-customer-form.tsx:97,366-378`,
    `src/pages/inventory/ornaments/mobile-ornament-form.tsx:843-856`,
    `src/pages/gold-ledger/mobile-gold-loan-form.tsx:407-420`.
12. Medium — Translucent bottom dock lets content slide visibly underneath (systemic).
    `src/components/mobile/bottom-nav-bar.tsx:64-74`,
    `src/components/mobile/mobile-shell.tsx:184-186`.

## Dell-small (1366×768) — 8 issues
1. High — Ornaments Category Tag overlaps Weight; table clipped right.
   `src/pages/inventory/ornaments/index.tsx:526` scroll.x 1400, `:624` Tag width 150.
2. High — Gold Ledger 12 cols force h-scroll, Actions off-screen.
   `src/pages/gold-ledger/index.tsx:406` scroll.x 1350, `:579` Actions fixed right 180.
3. Medium — Invoices `Making Charges` header wraps 2 lines.
   `src/pages/invoices/index.tsx:455` scroll.x 900 too small.
4. Medium — Invoices Customer name+code vertical stack doubles row height.
   `src/pages/invoices/index.tsx:411`.
5. Medium — Dashboard Revenue xl=16 + Metal xl=8 squeezed at 1366.
   `src/pages/dashboard/index.tsx:68` → move split to xxl.
6. Low — Ornaments Qty Tag marginRight:20 wastes 20px.
   `src/pages/inventory/ornaments/index.tsx:669`.
7. Low — Customers Address ellipsis no tooltip, Table no scroll prop.
   `src/pages/customers/index.tsx:320,341`.
8. Low — New Sale lg=16/8 leaves Summary ~350px narrow.
   `src/components/invoices/sale-form.tsx:760,898` → stack until xl.

## HP-big (1920×1080) — 8 issues
1. High — Dashboard KPI row caps at maxWidth:240, ~220px gutter.
   `src/components/dashboard/stats-cards.tsx:114-117`.
2. High — POS New Sale maxWidth:1400 centers with gutters + empty bottom half, duplicate Save CTAs.
   `src/components/invoices/sale-form.tsx:720`.
3. Medium — Customers Address balloons, empty Referred By wastes width.
   `src/pages/customers/index.tsx:341-343`.
4. High — Ornaments Category width:150 truncates into Weight.
   `src/pages/inventory/ornaments/index.tsx:624` (desktop twin of mobile #3 pattern).
5. Medium — Invoices scroll.x:900 << viewport, columns stretch arbitrarily.
   `src/pages/invoices/index.tsx:377`.
6. Medium — Gold Ledger scroll.x:1350 << viewport, 12 cols spread.
   `src/pages/gold-ledger/index.tsx:406`.
7. Low — Design Gallery lg=6 → 4×400px cards, height:180 squat.
   `src/pages/design-gallery/index.tsx:241,263`.
8. Medium — Settings no max-width, GOLD/SILVER ~800px stretched.
   `src/pages/settings/index.tsx:116`, `src/components/settings/making-charges-settings.tsx:94-96`.

## Functional QA — 5 issues
F1. High — Dashboard Quick-Action `New Sale` → `/create-sale` → 404.
    `src/components/dashboard/quick-actions.tsx:27`; same stale path
    `src/pages/invoices/index.tsx:308,536`, `src/components/dashboard/recent-invoices.tsx:156`.
F2. High — Invoice row actions → `/invoices/:id` → 404 (route is `/invoices/show/:id`).
    `src/pages/invoices/index.tsx:386,522`.
F3. High — Dashboard inventory links → `/inventory/ornaments` → 404 (route is `/ornaments`).
    `quick-actions.tsx:39`, `stats-cards.tsx:322,331`, `inventory-summary.tsx:108`.
F4. Medium — Every list page logs HTTP 400 `column shops.shop_id does not exist` (42703).
    Pages render (fallback) but shop-scoping query broken.
F5. Low — Chart 7D/30D/90D toggles are visually-hidden radios; synthetic click times out
    (needs manual click check, likely OK for real users).

## Design-system rules for all fixes
- Touch targets: min 44×44px on mobile (chips/pills/actions/tabs).
- No page-level horizontal scroll at 390px; tables get `scroll.x ≤ content width`,
  sticky first col, or card fallback below `md`.
- Filters: stack full-width on `xs`; scrollable pill rows use `flexWrap:nowrap; overflow-x:auto`.
- Drawers/modals: `width: min(480px, 100%)` / `maxWidth: calc(100vw - 32px)` on mobile.
- Docks: solid (opaque) background; single `paddingBottom: calc(96px + safe-area)`.
- Desktop: content `max-width: 1280–1600px` centered; `scroll.x` matched to viewport;
  `ellipsis` + tooltips on long cells; hide low-value cols below breakpoints.
- Tokens only: `theme.useToken()` (colorBgContainer, colorPrimary, colorBorderSecondary);
  no hardcoded `#fff/#f5f5f5/white` in dark mode.
