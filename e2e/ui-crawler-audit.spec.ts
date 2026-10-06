import { test, expect, Page } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";
import fs from "fs";
import path from "path";

// Viewports to test
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const THEMES = ["light", "dark"] as const;

export interface DiscoveredIssue {
  id: string;
  category: "OVERFLOW" | "THEME_BLEED" | "RESPONSIVENESS" | "UI_INCONSISTENCY" | "ROUTING" | "VALIDATION";
  severity: "Critical" | "High" | "Medium" | "Low";
  title: string;
  route: string;
  component: string;
  viewport: string;
  theme: string;
  details: string;
  elementSelector?: string;
  recommendation: string;
}

const discoveredIssues: DiscoveredIssue[] = [];
const issuesFile = path.resolve(process.cwd(), "test-results/discovered-issues.json");

function persistIssue(issue: DiscoveredIssue) {
  const exists = discoveredIssues.some(
    (i) =>
      i.title === issue.title &&
      i.route === issue.route &&
      i.viewport === issue.viewport &&
      i.theme === issue.theme
  );
  if (!exists) {
    discoveredIssues.push(issue);
    console.log(`[BUG DETECTED] [${issue.severity}] [${issue.category}] ${issue.title} on ${issue.route} (${issue.viewport}, ${issue.theme})`);
    try {
      fs.mkdirSync(path.dirname(issuesFile), { recursive: true });
      fs.writeFileSync(issuesFile, JSON.stringify(discoveredIssues, null, 2), "utf8");
    } catch (e) {
      // ignore write error
    }
  }
}

/**
 * Checks for horizontal layout overflow (scrollWidth > clientWidth)
 */
async function inspectHorizontalOverflow(page: Page, route: string, vpName: string, theme: string, contextName: string) {
  const overflowData = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const hasDocOverflow = scrollWidth > docWidth + 3;
    const hasBodyOverflow = bodyScrollWidth > docWidth + 3;

    let culprits: Array<{ tag: string; cls: string; sw: number; ow: number }> = [];

    if (hasDocOverflow || hasBodyOverflow) {
      const allEls = Array.from(document.querySelectorAll("header, nav, main, section, aside, div, table, form"));
      for (const el of allEls) {
        const sw = el.scrollWidth;
        const ow = (el as HTMLElement).offsetWidth || 0;
        const isTableContent = el.classList.contains("ant-table-content") || el.classList.contains("ant-table-body");
        if (sw > docWidth + 5 && !isTableContent) {
          culprits.push({
            tag: el.tagName.toLowerCase(),
            cls: (typeof el.className === "string") ? el.className.split(" ").slice(0, 2).join(".") : "",
            sw,
            ow,
          });
        }
      }
    }

    return {
      hasDocOverflow,
      hasBodyOverflow,
      docWidth,
      scrollWidth,
      bodyScrollWidth,
      culprits: culprits.slice(0, 3),
    };
  });

  if (overflowData.hasDocOverflow || overflowData.hasBodyOverflow) {
    persistIssue({
      id: `OVF-${route.replace(/[^a-zA-Z0-9]/g, "-")}-${vpName}`,
      category: "OVERFLOW",
      severity: vpName === "mobile" ? "High" : "Medium",
      title: `Unwanted horizontal layout overflow on ${contextName}`,
      route,
      component: contextName,
      viewport: vpName,
      theme,
      details: `Viewport width is ${overflowData.docWidth}px, but content width reached ${Math.max(
        overflowData.scrollWidth,
        overflowData.bodyScrollWidth
      )}px causing mobile horizontal scrolling. Culprits: ${overflowData.culprits.map((c) => `${c.tag}.${c.cls} (scrollWidth: ${c.sw}px)`).join(", ")}`,
      elementSelector: overflowData.culprits.map((c) => `${c.tag}.${c.cls}`).join(", "),
      recommendation: `Add 'max-width: 100%; overflow-x: hidden;' on page root container or ensure nested flex/grid elements have 'min-width: 0' and table wrappers use Ant Design's 'scroll={{ x: ... }}' without overflowing parent containers.`,
    });
  }
}

/**
 * Checks for hardcoded theme bleed in dark mode
 */
async function inspectThemeBleed(page: Page, route: string, vpName: string, currentTheme: string, contextName: string) {
  if (currentTheme !== "dark") return;

  const bleedData = await page.evaluate(() => {
    const bleeds: Array<{ selector: string; bg: string; color: string }> = [];
    const elements = Array.from(document.querySelectorAll("div, card, span, table, th, td, form, input, button, aside, section"));

    for (const el of elements) {
      const inlineStyle = el.getAttribute("style") || "";
      const isExplicitLight =
        inlineStyle.includes("background: \"#f5f5f5\"") ||
        inlineStyle.includes("background: #f5f5f5") ||
        inlineStyle.includes("background: rgb(245, 245, 245)") ||
        inlineStyle.includes("background: #fff") ||
        inlineStyle.includes("background: #ffffff") ||
        inlineStyle.includes("background-color: #fff") ||
        inlineStyle.includes("background-color: #ffffff");

      if (isExplicitLight && !el.closest(".ant-tour") && !el.closest(".recharts-tooltip-wrapper")) {
        const cls = (el.className && typeof el.className === "string") ? el.className.split(" ").slice(0, 2).join(".") : el.tagName.toLowerCase();
        bleeds.push({
          selector: `${el.tagName.toLowerCase()}.${cls}`,
          bg: inlineStyle,
          color: (el as HTMLElement).style.color || "",
        });
      }
    }

    return bleeds.slice(0, 4);
  });

  for (const b of bleedData) {
    persistIssue({
      id: `BLEED-${route.replace(/[^a-zA-Z0-9]/g, "-")}`,
      category: "THEME_BLEED",
      severity: "High",
      title: `Hardcoded light background style in Dark Mode on ${contextName}`,
      route,
      component: contextName,
      viewport: vpName,
      theme: currentTheme,
      details: `Element ${b.selector} has hardcoded inline style (${b.bg}) in dark mode instead of Ant Design theme tokens (token.colorBgContainer or token.colorBgElevated).`,
      elementSelector: b.selector,
      recommendation: `Replace hardcoded background color with Ant Design design token: theme.useToken().token.colorBgContainer or token.colorFillAlter.`,
    });
  }
}

/**
 * Checks drawer and modal width bounds
 */
async function inspectOverlayBounds(page: Page, route: string, vpName: string, theme: string, overlayName: string) {
  const bounds = await page.evaluate(() => {
    const vpW = window.innerWidth;
    const drawerWrapper = document.querySelector(".ant-drawer-open .ant-drawer-content-wrapper") as HTMLElement;
    let drawerIssue = null;
    if (drawerWrapper) {
      const rect = drawerWrapper.getBoundingClientRect();
      if (rect.width > vpW + 2) {
        drawerIssue = `Drawer width (${Math.round(rect.width)}px) exceeds screen width (${vpW}px)`;
      }
    }

    const modal = document.querySelector(".ant-modal") as HTMLElement;
    let modalIssue = null;
    if (modal) {
      const rect = modal.getBoundingClientRect();
      if (rect.width > vpW + 2) {
        modalIssue = `Modal width (${Math.round(rect.width)}px) exceeds screen width (${vpW}px)`;
      }
    }

    return { drawerIssue, modalIssue, vpW };
  });

  if (bounds.drawerIssue) {
    persistIssue({
      id: `DRAWER-RESP-${route.replace(/[^a-zA-Z0-9]/g, "-")}-${vpName}`,
      category: "RESPONSIVENESS",
      severity: "High",
      title: `Drawer exceeds viewport width on ${vpName} (${overlayName})`,
      route,
      component: overlayName,
      viewport: vpName,
      theme,
      details: bounds.drawerIssue,
      recommendation: `Use responsive drawer width (e.g. width={screens.xs ? "100%" : 480} using Grid.useBreakpoint()) to prevent mobile viewport clipping.`,
    });
  }

  if (bounds.modalIssue) {
    persistIssue({
      id: `MODAL-RESP-${route.replace(/[^a-zA-Z0-9]/g, "-")}-${vpName}`,
      category: "RESPONSIVENESS",
      severity: "High",
      title: `Modal width exceeds viewport width on ${vpName} (${overlayName})`,
      route,
      component: overlayName,
      viewport: vpName,
      theme,
      details: bounds.modalIssue,
      recommendation: `Ensure modal has 'width="95%"' or 'maxWidth="520px"' with 'style={{ maxWidth: "calc(100vw - 32px)" }}' on mobile viewports.`,
    });
  }
}

test.describe("Exhaustive Shringar POS Crawl & UX Inspection", () => {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Audit across ${vp.name} (${vp.width}x${vp.height}) - Theme: ${theme}`, async ({ page }) => {
        test.setTimeout(180000); // 3 mins per viewport-theme run
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await setupAuthenticatedContext(page, { colorMode: theme });

        const screenshotsDir = path.resolve(process.cwd(), "e2e/screenshots");
        if (!fs.existsSync(screenshotsDir)) {
          fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        // ==========================================
        // 1. DASHBOARD (/dashboard)
        // ==========================================
        await page.goto("/dashboard");
        await expect(page.locator("text=Welcome back").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/dashboard", vp.name, theme, "Dashboard");
        await inspectThemeBleed(page, "/dashboard", vp.name, theme, "Dashboard");

        await page.screenshot({
          path: path.join(screenshotsDir, `dashboard-${vp.name}-${theme}.png`),
          fullPage: vp.name === "mobile",
        });

        // ==========================================
        // 2. CUSTOMERS (/customers)
        // ==========================================
        await page.goto("/customers");
        await expect(page.locator("text=Customers").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/customers", vp.name, theme, "Customers Table");
        await inspectThemeBleed(page, "/customers", vp.name, theme, "Customers Table");

        await page.screenshot({
          path: path.join(screenshotsDir, `customers-${vp.name}-${theme}.png`),
        });

        // Click "New Customer"
        const newCustBtn = page.getByRole("button", { name: /New Customer/i });
        if (await newCustBtn.isVisible()) {
          await newCustBtn.click();
          await page.waitForTimeout(400);

          await inspectOverlayBounds(page, "/customers", vp.name, theme, "Customer Create Modal");
          await inspectThemeBleed(page, "/customers", vp.name, theme, "Customer Create Modal");

          await page.screenshot({
            path: path.join(screenshotsDir, `customer-modal-${vp.name}-${theme}.png`),
          });

          // Trigger form validation to check validation layout
          const modalSave = page.locator(".ant-modal-footer button.ant-btn-primary").first();
          if (await modalSave.isVisible()) {
            await modalSave.click();
            await page.waitForTimeout(300);
          }

          // Close modal
          const modalCancel = page.locator(".ant-modal-close, .ant-modal-footer button").first();
          if (await modalCancel.isVisible()) {
            await modalCancel.click();
            await page.waitForTimeout(300);
          }
        }

        // Click View Details on first customer row
        const viewCustomerBtn = page.locator("button .anticon-eye").first();
        if (await viewCustomerBtn.isVisible()) {
          await viewCustomerBtn.click({ force: true });
          await page.waitForTimeout(400);
          await inspectOverlayBounds(page, "/customers", vp.name, theme, "Customer Show Modal");
          await page.screenshot({
            path: path.join(screenshotsDir, `customer-show-${vp.name}-${theme}.png`),
          });
          const closeShowModal = page.locator(".ant-modal-close, .ant-modal-footer button").first();
          if (await closeShowModal.isVisible()) {
            await closeShowModal.click();
            await page.waitForTimeout(300);
          }
        }

        // ==========================================
        // 3. INVENTORY ORNAMENTS (/inventory/ornaments)
        // ==========================================
        await page.goto("/inventory/ornaments");
        await expect(page.locator("text=Ornaments").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/inventory/ornaments", vp.name, theme, "Ornaments Table");
        await inspectThemeBleed(page, "/inventory/ornaments", vp.name, theme, "Ornaments Table");

        await page.screenshot({
          path: path.join(screenshotsDir, `ornaments-${vp.name}-${theme}.png`),
        });

        // Click "New Ornament" (drawer)
        const newOrnBtn = page.getByRole("button", { name: /New Ornament/i });
        if (await newOrnBtn.isVisible()) {
          await newOrnBtn.click();
          await page.waitForTimeout(500);

          await inspectOverlayBounds(page, "/inventory/ornaments", vp.name, theme, "Ornament Drawer");
          await inspectThemeBleed(page, "/inventory/ornaments", vp.name, theme, "Ornament Drawer");

          await page.screenshot({
            path: path.join(screenshotsDir, `ornament-drawer-${vp.name}-${theme}.png`),
          });

          // Check drawer responsiveness
          const closeDrawerBtn = page.locator(".ant-drawer-open .ant-drawer-close, .ant-drawer-open button:has-text('Cancel')").first();
          if (await closeDrawerBtn.isVisible()) {
            await closeDrawerBtn.click();
            await page.waitForTimeout(300);
          }
        }

        // ==========================================
        // 4. INVENTORY CATEGORIES (/inventory/categories)
        // ==========================================
        await page.goto("/inventory/categories");
        await expect(page.locator("text=Categories").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/inventory/categories", vp.name, theme, "Categories Grid");
        await inspectThemeBleed(page, "/inventory/categories", vp.name, theme, "Categories Grid");

        if (theme === "dark") {
          const placeholderBleed = await page.evaluate(() => {
            const placeholders = Array.from(document.querySelectorAll(".ant-card div")).filter(
              (el) => (el as HTMLElement).style.background === "#f5f5f5" || window.getComputedStyle(el).backgroundColor === "rgb(245, 245, 245)"
            );
            return placeholders.length > 0;
          });

          if (placeholderBleed) {
            persistIssue({
              id: "CATEGORY-CARD-PLACEHOLDER-BLEED",
              category: "THEME_BLEED",
              severity: "High",
              title: "CategoryCard image placeholder uses hardcoded '#f5f5f5' in Dark Mode",
              route: "/inventory/categories",
              component: "CategoryCard (/pages/inventory/categories/index.tsx)",
              viewport: vp.name,
              theme,
              details:
                "CategoryCard sets `style={{ height: 160, background: '#f5f5f5', ... }}` for categories without an image. In Dark Mode, this creates a glaring white rectangle (#f5f5f5) inside the dark card with low icon contrast.",
              elementSelector: ".ant-card div[style*='#f5f5f5']",
              recommendation: "Use token.colorFillAlter or token.colorBgContainerDisabled from theme.useToken() instead of hardcoded '#f5f5f5'.",
            });
          }
        }

        await page.screenshot({
          path: path.join(screenshotsDir, `categories-${vp.name}-${theme}.png`),
        });

        // Click "New Category"
        const newCatBtn = page.getByRole("button", { name: /New Category/i });
        if (await newCatBtn.isVisible()) {
          await newCatBtn.click();
          await page.waitForTimeout(400);
          await inspectOverlayBounds(page, "/inventory/categories", vp.name, theme, "Category Modal");
          await page.screenshot({
            path: path.join(screenshotsDir, `category-modal-${vp.name}-${theme}.png`),
          });
          const modalCancel = page.locator(".ant-modal-close, .ant-modal-footer button").first();
          if (await modalCancel.isVisible()) {
            await modalCancel.click();
            await page.waitForTimeout(300);
          }
        }

        // ==========================================
        // 5. METAL RATES (/metal-rates)
        // ==========================================
        await page.goto("/metal-rates");
        await expect(page.locator("text=Metal Rates").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/metal-rates", vp.name, theme, "Metal Rates");
        await inspectThemeBleed(page, "/metal-rates", vp.name, theme, "Metal Rates");

        await page.screenshot({
          path: path.join(screenshotsDir, `metal-rates-${vp.name}-${theme}.png`),
        });

        // Popover update check
        const updateRateBtn = page.locator("button:has-text('Update Rate'), button:has-text('Update')").first();
        if (await updateRateBtn.isVisible()) {
          await updateRateBtn.click();
          await page.waitForTimeout(400);
          await page.screenshot({
            path: path.join(screenshotsDir, `metal-rate-popover-${vp.name}-${theme}.png`),
          });
        }

        // ==========================================
        // 6. GOLD LEDGER (/gold-ledger)
        // ==========================================
        await page.goto("/gold-ledger");
        await expect(page.locator("text=Gold Ledger").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/gold-ledger", vp.name, theme, "Gold Ledger");
        await inspectThemeBleed(page, "/gold-ledger", vp.name, theme, "Gold Ledger");

        await page.screenshot({
          path: path.join(screenshotsDir, `gold-ledger-${vp.name}-${theme}.png`),
        });

        // Open Add New Loan drawer
        const addLoanBtn = page.getByRole("button", { name: /Add New Loan/i });
        if (await addLoanBtn.isVisible()) {
          await addLoanBtn.click();
          await page.waitForTimeout(500);

          await inspectOverlayBounds(page, "/gold-ledger", vp.name, theme, "Add Loan Drawer");
          await inspectThemeBleed(page, "/gold-ledger", vp.name, theme, "Add Loan Drawer");

          await page.screenshot({
            path: path.join(screenshotsDir, `gold-ledger-add-loan-${vp.name}-${theme}.png`),
          });

          // Close drawer
          const closeDrawerBtn = page.locator(".ant-drawer-open .ant-drawer-close, .ant-drawer-open button:has-text('Cancel')").first();
          if (await closeDrawerBtn.isVisible()) {
            await closeDrawerBtn.click();
            await page.waitForTimeout(300);
          }
        }

        // Open Loan Show Drawer
        const viewLoanBtn = page.locator("table button .anticon-eye").first();
        if (await viewLoanBtn.isVisible()) {
          await viewLoanBtn.click({ force: true });
          await page.waitForTimeout(500);
          await inspectOverlayBounds(page, "/gold-ledger", vp.name, theme, "Loan Details Drawer");
          await page.screenshot({
            path: path.join(screenshotsDir, `gold-ledger-show-loan-${vp.name}-${theme}.png`),
          });
          const closeShowDrawer = page.locator(".ant-drawer-open .ant-drawer-close, .ant-drawer-open button:has-text('Close')").first();
          if (await closeShowDrawer.isVisible()) {
            await closeShowDrawer.click();
            await page.waitForTimeout(300);
          }
        }

        // ==========================================
        // 7. GOLD LEDGER REPORTS (/gold-ledger/reports)
        // ==========================================
        await page.goto("/gold-ledger/reports");
        await expect(page.locator("text=Gold Ledger Reports").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/gold-ledger/reports", vp.name, theme, "Gold Ledger Reports (Running)");
        await inspectThemeBleed(page, "/gold-ledger/reports", vp.name, theme, "Gold Ledger Reports (Running)");

        await page.screenshot({
          path: path.join(screenshotsDir, `gold-ledger-reports-running-${vp.name}-${theme}.png`),
        });

        // Switch to "Closed Loans" tab
        const closedTabBtn = page.locator("label:has-text('Closed Loans'), input[value='closed']").first();
        if (await closedTabBtn.isVisible()) {
          await closedTabBtn.click();
          await page.waitForTimeout(400);

          await inspectHorizontalOverflow(page, "/gold-ledger/reports", vp.name, theme, "Gold Ledger Reports (Closed)");
          await inspectThemeBleed(page, "/gold-ledger/reports", vp.name, theme, "Gold Ledger Reports (Closed)");

          await page.screenshot({
            path: path.join(screenshotsDir, `gold-ledger-reports-closed-${vp.name}-${theme}.png`),
          });
        }

        // ==========================================
        // 8. POS CREATE SALE (/create-sale & check /pos/create)
        // ==========================================
        // Verify /pos/create routing status
        await page.goto("/pos/create");
        await page.waitForTimeout(800);
        const isErrorPage =
          (await page.locator(".ant-result-404, .ant-result-error").count() > 0) ||
          (await page.getByText("Sorry", { exact: false }).count() > 0);
        if (isErrorPage) {
          persistIssue({
            id: "ROUTING-POS-CREATE-NOT-FOUND",
            category: "ROUTING",
            severity: "High",
            title: "Standard route '/pos/create' results in 404 Error page",
            route: "/pos/create",
            component: "App.tsx",
            viewport: vp.name,
            theme,
            details:
              "The POS Create Sale route is defined as '/create-sale' in App.tsx. Visiting '/pos/create' hits Refine's CatchAll <ErrorComponent />, resulting in a 404 page.",
            recommendation: "Add '<Route path=\"/pos/create\" element={<Navigate to=\"/create-sale\" replace />} />' in App.tsx.",
          });
        }

        // Test POS create sale route: /create-sale
        await page.goto("/create-sale");
        await expect(page.locator("text=Create Sale").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/create-sale", vp.name, theme, "POS Create Sale");
        await inspectThemeBleed(page, "/create-sale", vp.name, theme, "POS Create Sale");

        await page.screenshot({
          path: path.join(screenshotsDir, `pos-create-sale-${vp.name}-${theme}.png`),
          fullPage: vp.name === "mobile",
        });

        // ==========================================
        // 9. INVOICES (/invoices)
        // ==========================================
        await page.goto("/invoices");
        await expect(page.locator("text=Invoices").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/invoices", vp.name, theme, "Invoices Table");
        await inspectThemeBleed(page, "/invoices", vp.name, theme, "Invoices Table");

        await page.screenshot({
          path: path.join(screenshotsDir, `invoices-${vp.name}-${theme}.png`),
        });

        // Navigate to Invoice Show
        const viewInvoiceBtn = page.locator("table button .anticon-eye").first();
        if (await viewInvoiceBtn.isVisible()) {
          await viewInvoiceBtn.click({ force: true });
          await page.waitForTimeout(600);

          await inspectHorizontalOverflow(page, page.url(), vp.name, theme, "Invoice Details Show");
          await inspectThemeBleed(page, page.url(), vp.name, theme, "Invoice Details Show");

          await page.screenshot({
            path: path.join(screenshotsDir, `invoice-show-${vp.name}-${theme}.png`),
            fullPage: vp.name === "mobile",
          });
        }

        // ==========================================
        // 10. SETTINGS (/settings)
        // ==========================================
        await page.goto("/settings");
        await expect(page.locator("text=Making Charges").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/settings", vp.name, theme, "Settings Page");
        await inspectThemeBleed(page, "/settings", vp.name, theme, "Settings Page");

        // Specific Tab Underline Bug in Light Mode
        const tabCheck = await page.evaluate(() => {
          const tabItems = Array.from(document.querySelectorAll("div")).filter((d) =>
            d.innerText === "Making Charges" || d.innerText === "Shop Settings"
          );
          const activeItem = tabItems.find((t) => t.style.borderBottom && t.style.borderBottom.includes("white"));
          return { hasWhiteActiveBorder: !!activeItem };
        });

        if (tabCheck.hasWhiteActiveBorder) {
          persistIssue({
            id: "SETTINGS-TAB-WHITE-UNDERLINE",
            category: "THEME_BLEED",
            severity: "High",
            title: "Settings active tab underline hardcoded to '2px solid white' (invisible in Light Mode)",
            route: "/settings",
            component: "TabItem (/pages/settings/index.tsx)",
            viewport: vp.name,
            theme,
            details:
              "In /pages/settings/index.tsx, TabItem sets `borderBottom: active ? '2px solid white' : '2px solid transparent'`. In Light Mode, this white underline is completely invisible against the white container background. Also the divider is hardcoded `#e5e5e5`.",
            elementSelector: ".settings-tab",
            recommendation: "Use Ant Design's `<Tabs />` component or `token.colorPrimary` for the active underline and `token.colorBorderSecondary` for the bottom border.",
          });
        }

        await page.screenshot({
          path: path.join(screenshotsDir, `settings-making-charges-${vp.name}-${theme}.png`),
        });

        // Switch to Shop Settings tab
        const shopTab = page.locator("div:has-text('Shop Settings')").last();
        if (await shopTab.isVisible()) {
          await shopTab.click();
          await page.waitForTimeout(400);

          await inspectHorizontalOverflow(page, "/settings", vp.name, theme, "Shop Settings Tab");
          await inspectThemeBleed(page, "/settings", vp.name, theme, "Shop Settings Tab");

          await page.screenshot({
            path: path.join(screenshotsDir, `settings-shop-${vp.name}-${theme}.png`),
            fullPage: vp.name === "mobile",
          });
        }


        // ==========================================
        // 12. DESIGN GALLERY (/design-gallery and /design-gallery/:id)
        // ==========================================
        await page.goto("/design-gallery");
        await expect(page.locator("h3:has-text('Design Gallery')").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(600);

        await inspectHorizontalOverflow(page, "/design-gallery", vp.name, theme, "Design Gallery Hub");
        await inspectThemeBleed(page, "/design-gallery", vp.name, theme, "Design Gallery Hub");

        await page.screenshot({
          path: path.join(screenshotsDir, `design-gallery-${vp.name}-${theme}.png`),
          fullPage: vp.name === "mobile",
        });

        // Open "Create Album" modal
        const createAlbumBtn = page.locator("button:has-text('Create Album'), button:has-text('Create First Album')").first();
        if (await createAlbumBtn.isVisible()) {
          await createAlbumBtn.click();
          await page.waitForTimeout(400);

          await inspectOverlayBounds(page, "/design-gallery", vp.name, theme, "Create Album Modal");
          await inspectThemeBleed(page, "/design-gallery", vp.name, theme, "Create Album Modal");

          await page.screenshot({
            path: path.join(screenshotsDir, `create-album-modal-${vp.name}-${theme}.png`),
          });

          // Close modal
          const modalCancel = page.locator(".ant-modal-close, .ant-modal-footer button").first();
          if (await modalCancel.isVisible()) {
            await modalCancel.click();
            await page.waitForTimeout(300);
          }
        }

        // Navigate to Album Detail View (/design-gallery/album-1)
        const openAlbumBtn = page.locator(".ant-card button:has-text('Open')").first();
        if (await openAlbumBtn.isVisible()) {
          await openAlbumBtn.click();
          await page.waitForTimeout(600);

          await inspectHorizontalOverflow(page, "/design-gallery/album-1", vp.name, theme, "Album Detail Show");
          await inspectThemeBleed(page, "/design-gallery/album-1", vp.name, theme, "Album Detail Show");

          await page.screenshot({
            path: path.join(screenshotsDir, `album-show-${vp.name}-${theme}.png`),
            fullPage: vp.name === "mobile",
          });

          // Open Upload Designs Modal
          const uploadBtn = page.locator("button:has-text('Upload Designs')").first();
          if (await uploadBtn.isVisible()) {
            await uploadBtn.click();
            await page.waitForTimeout(400);

            await inspectOverlayBounds(page, "/design-gallery/album-1", vp.name, theme, "Upload Designs Modal");
            await inspectThemeBleed(page, "/design-gallery/album-1", vp.name, theme, "Upload Designs Modal");

            await page.screenshot({
              path: path.join(screenshotsDir, `upload-designs-modal-${vp.name}-${theme}.png`),
            });

            // Close upload modal
            const closeUpload = page.locator(".ant-modal-close").first();
            if (await closeUpload.isVisible()) {
              await closeUpload.click();
              await page.waitForTimeout(300);
            }
          }

          // Launch Customer Presentation Mode
          const presentBtn = page.locator("button:has-text('Customer Presentation')").first();
          if (await presentBtn.isVisible()) {
            await presentBtn.click();
            await page.waitForTimeout(500);

            const previewOps = page.locator(".ant-image-preview-operations");
            if (await previewOps.isVisible()) {
              await inspectThemeBleed(page, "/design-gallery/album-1", vp.name, theme, "Customer Presentation Mode");
              await page.screenshot({
                path: path.join(screenshotsDir, `presentation-mode-${vp.name}-${theme}.png`),
              });
              await page.keyboard.press("Escape");
              await page.waitForTimeout(300);
            }
          }
        }

        // ==========================================
        // 11. AUTH / LOGIN (/login)
        // ==========================================
        const loginContext = await page.context().browser()?.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        if (loginContext) {
          const loginPage = await loginContext.newPage();
          await loginPage.addInitScript(({ colorMode }) => {
            window.localStorage.setItem("colorMode", colorMode);
          }, { colorMode: theme });

          await loginPage.goto("http://localhost:5173/login");
          await expect(loginPage.locator("text=Sign in").first()).toBeVisible({ timeout: 15000 });
          await loginPage.waitForTimeout(400);

          await inspectHorizontalOverflow(loginPage, "/login", vp.name, theme, "Login Page");
          await inspectThemeBleed(loginPage, "/login", vp.name, theme, "Login Page");

          await loginPage.screenshot({
            path: path.join(screenshotsDir, `login-${vp.name}-${theme}.png`),
          });

          await loginContext.close();
        }
      });
    }
  }
});
