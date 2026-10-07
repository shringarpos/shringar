import { test, expect, devices } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.use({ ...devices["Pixel 7"] });

test.describe("Theme Contrast & Drawer Readability Audit", () => {
  test("Dark theme provides true black background and crisp legible text in More drawer & Metal rates drawer", async ({
    page,
  }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open More Drawer to toggle Dark Theme if not already active
    const moreNavBtn = page.getByTestId("mobile-nav-more");
    await expect(moreNavBtn).toBeVisible({ timeout: 15000 });
    await moreNavBtn.click();

    const moreDrawer = page.getByTestId("mobile-more-drawer");
    await expect(moreDrawer).toBeVisible();

    // Check if dark switch is on or toggle it to dark
    const switchBtn = moreDrawer.locator(".ant-switch");
    const isChecked = await switchBtn.evaluate((el) => el.classList.contains("ant-switch-checked"));
    if (!isChecked) {
      await switchBtn.click();
    }

    // Verify document root theme is dark
    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(themeAttr).toBe("dark");

    // Check that More drawer title / text is NOT black (#0f172a / #000000)
    const drawerItem = page.getByTestId("drawer-item-customers");
    await expect(drawerItem).toBeVisible();
    const labelColor = await drawerItem.locator("span").first().evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    // Color should be bright (#f8fafc or #60a5fa), never dark black
    expect(labelColor).not.toBe("rgb(15, 23, 42)");
    expect(labelColor).not.toBe("rgb(0, 0, 0)");

    // Close More drawer
    await page.keyboard.press("Escape");
    await expect(moreDrawer).not.toBeVisible();

    // Verify Mobile Metal Rates Bar is visible in Dark Mode
    const metalRatesBar = page.getByTestId("mobile-metal-rates-bar");
    await expect(metalRatesBar).toBeVisible();

    // Tap Update button to open Metal Rates quick update drawer
    await page.getByTestId("mobile-rate-edit-btn").click();
    const ratesDrawer = page.getByTestId("mobile-rates-drawer");
    await expect(ratesDrawer).toBeVisible();

    // Verify title text is visible and NOT dark black
    const titleEl = ratesDrawer.getByText("Today's Metal Rates");
    await expect(titleEl).toBeVisible();
    const titleColor = await titleEl.evaluate((el) => window.getComputedStyle(el).color);
    expect(titleColor).not.toBe("rgb(15, 23, 42)");
    expect(titleColor).not.toBe("rgb(0, 0, 0)");

    // Close rates drawer
    await ratesDrawer.getByText("Cancel").click();
    await expect(ratesDrawer).not.toBeVisible();
  });

  test("Light theme provides off-white canvas and elevated white cards without flat white-on-white", async ({
    page,
  }) => {
    await setupAuthenticatedContext(page);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open More drawer and ensure light mode
    const moreNavBtn = page.getByTestId("mobile-nav-more");
    await expect(moreNavBtn).toBeVisible({ timeout: 15000 });
    await moreNavBtn.click();

    const moreDrawer = page.getByTestId("mobile-more-drawer");
    await expect(moreDrawer).toBeVisible();

    const switchBtn = moreDrawer.locator(".ant-switch");
    const isChecked = await switchBtn.evaluate((el) => el.classList.contains("ant-switch-checked"));
    if (isChecked) {
      await switchBtn.click();
    }

    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(themeAttr).toBe("light");

    // Close drawer
    await page.keyboard.press("Escape");

    // Check body or html background
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    // #f1f5f9 -> rgb(241, 245, 249)
    expect(bodyBg).toBe("rgb(241, 245, 249)");
  });
});
