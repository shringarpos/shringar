import { test, expect, Page } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const THEMES = ["light", "dark"] as const;

export interface CrawlFinding {
  severity: "Pass" | "Info" | "Warning" | "Error";
  viewport: string;
  theme: string;
  component: string;
  check: string;
  details: string;
}

const crawlFindings: CrawlFinding[] = [];
const outputDir = path.resolve(process.cwd(), "e2e/screenshots/gallery");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function verifyHorizontalOverflow(page: Page, viewport: string, theme: string, screenName: string) {
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const docSw = document.documentElement.scrollWidth;
    const bodySw = document.body.scrollWidth;
    return {
      hasOverflow: docSw > docW + 3 || bodySw > docW + 3,
      docW,
      docSw,
      bodySw,
    };
  });

  if (overflow.hasOverflow) {
    crawlFindings.push({
      severity: "Warning",
      viewport,
      theme,
      component: screenName,
      check: "Horizontal Overflow",
      details: `Viewport ${overflow.docW}px, scrollWidth reached ${Math.max(overflow.docSw, overflow.bodySw)}px`,
    });
  } else {
    crawlFindings.push({
      severity: "Pass",
      viewport,
      theme,
      component: screenName,
      check: "Horizontal Overflow",
      details: `No overflow detected (${overflow.docW}px)`,
    });
  }
}

async function verifyThemeBleed(page: Page, viewport: string, theme: string, screenName: string) {
  if (theme !== "dark") return;

  const bleeds = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("div, card, span, table, form, input, button"));
    const issues: string[] = [];
    for (const el of elements) {
      const style = el.getAttribute("style") || "";
      if (
        (style.includes("background: #fff") ||
          style.includes("background-color: #fff") ||
          style.includes("background: white") ||
          style.includes("background: #f5f5f5")) &&
        !el.closest(".ant-image-preview-operations") &&
        !el.closest(".ant-tour")
      ) {
        issues.push(`${el.tagName.toLowerCase()}: ${style.slice(0, 50)}`);
      }
    }
    return issues.slice(0, 3);
  });

  if (bleeds.length > 0) {
    crawlFindings.push({
      severity: "Warning",
      viewport,
      theme,
      component: screenName,
      check: "Dark Mode Theme Bleed",
      details: `Elements with hardcoded white backgrounds: ${bleeds.join("; ")}`,
    });
  } else {
    crawlFindings.push({
      severity: "Pass",
      viewport,
      theme,
      component: screenName,
      check: "Dark Mode Theme Bleed",
      details: "Proper Ant Design dark mode tokens applied throughout container and sub-elements",
    });
  }
}

test.describe("Design Gallery Crawler Agent Playwright Audit", () => {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`Crawl Design Gallery on ${vp.name} (${vp.width}x${vp.height}) - Theme: ${theme}`, async ({ page }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await setupAuthenticatedContext(page, { colorMode: theme });

        // 1. Audit Gallery Hub (Populated State)
        await page.goto("/design-gallery");
        await expect(page.locator("h3:has-text('Design Gallery')").first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(500);

        await verifyHorizontalOverflow(page, vp.name, theme, "Gallery Hub");
        await verifyThemeBleed(page, vp.name, theme, "Gallery Hub");

        await page.screenshot({
          path: path.join(outputDir, `hub-${vp.name}-${theme}.png`),
          fullPage: vp.name === "mobile",
        });

        // 2. Audit Create Album Modal
        const createBtn = page.locator("button:has-text('Create Album')").first();
        if (await createBtn.isVisible()) {
          await createBtn.click();
          await page.waitForTimeout(400);

          const modal = page.locator(".ant-modal:has-text('Create Design Album')");
          await expect(modal).toBeVisible();

          await verifyThemeBleed(page, vp.name, theme, "Create Album Modal");

          await page.screenshot({
            path: path.join(outputDir, `modal-create-${vp.name}-${theme}.png`),
          });

          // Close modal
          await page.locator(".ant-modal:has-text('Create Design Album') .ant-modal-close").click();
          await page.waitForTimeout(300);
        }

        // 3. Audit Album Show View (/design-gallery/album-1)
        await page.goto("/design-gallery/album-1");
        await expect(page.locator("h3:has-text('Solitaire & Engagement Rings')")).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(500);

        await verifyHorizontalOverflow(page, vp.name, theme, "Album Detail View");
        await verifyThemeBleed(page, vp.name, theme, "Album Detail View");

        await page.screenshot({
          path: path.join(outputDir, `album-show-${vp.name}-${theme}.png`),
          fullPage: vp.name === "mobile",
        });

        // 4. Audit Batch Upload Modal
        const uploadBtn = page.locator("button:has-text('Upload Designs')");
        if (await uploadBtn.isVisible()) {
          await uploadBtn.click();
          await page.waitForTimeout(400);

          const uploadModal = page.locator(".ant-modal:has-text('Upload Design Photos')");
          await expect(uploadModal).toBeVisible();

          await verifyThemeBleed(page, vp.name, theme, "Upload Modal");

          await page.screenshot({
            path: path.join(outputDir, `modal-upload-${vp.name}-${theme}.png`),
          });

          // Close upload modal
          await page.locator(".ant-modal:has-text('Upload Design Photos') .ant-modal-close").click();
          await page.waitForTimeout(300);
        }

        // 5. Audit Customer Presentation Lightbox
        const presentBtn = page.locator("button:has-text('Customer Presentation')");
        if (await presentBtn.isVisible()) {
          await presentBtn.click();
          await page.waitForTimeout(500);

          const previewOps = page.locator(".ant-image-preview-operations");
          await expect(previewOps).toBeVisible();

          await page.screenshot({
            path: path.join(outputDir, `lightbox-${vp.name}-${theme}.png`),
          });

          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }

        // 6. Audit Empty State (when zero albums)
        await setupAuthenticatedContext(page, { colorMode: theme, albums: [], photos: [] });
        await page.goto("/design-gallery");
        await expect(page.locator("text=No Design Albums Yet")).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(400);

        await verifyHorizontalOverflow(page, vp.name, theme, "Gallery Empty State");
        await verifyThemeBleed(page, vp.name, theme, "Gallery Empty State");

        await page.screenshot({
          path: path.join(outputDir, `empty-state-${vp.name}-${theme}.png`),
        });
      });
    }
  }

  test.afterAll(() => {
    const reportPath = path.resolve(process.cwd(), "test-results/crawler-gallery-report.json");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(crawlFindings, null, 2), "utf8");
    console.log(`[CRAWLER COMPLETE] Audited all viewports & themes. Report saved to: ${reportPath}`);
  });
});
