import { test, expect } from "@playwright/test";
import { setupAuthenticatedContext } from "./fixtures/mock-auth";

test.describe("Design Gallery Feature & UX Tests", () => {
  test("1. Sidebar displays 'Design Gallery' and navigates to the gallery hub", async ({ page }) => {
    await setupAuthenticatedContext(page);

    await page.goto("/dashboard");
    const sidebar = page.locator(".ant-layout-sider");
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Look for Design Gallery in the sidebar
    const galleryNavItem = sidebar.locator("text=Design Gallery");
    await expect(galleryNavItem).toBeVisible();

    await galleryNavItem.click();
    await page.waitForURL("**/design-gallery");

    // Header title and tag check
    await expect(page.locator("h3:has-text('Design Gallery')")).toBeVisible();
    await expect(page.locator(".ant-tag:has-text('Lookbook')")).toBeVisible();
  });

  test("2. Clean empty state renders when no albums exist", async ({ page }) => {
    // Seed with empty albums
    await setupAuthenticatedContext(page, { albums: [], photos: [] });

    await page.goto("/design-gallery");
    await expect(page.locator("h3:has-text('Design Gallery')")).toBeVisible({ timeout: 15000 });

    // Verify empty state is displayed
    await expect(page.locator("text=No Design Albums Yet")).toBeVisible();
    await expect(page.locator("button:has-text('Create First Album')")).toBeVisible();
  });

  test("3. Creates a new category album smoothly via modal", async ({ page }) => {
    await setupAuthenticatedContext(page, { albums: [], photos: [] });

    await page.goto("/design-gallery");
    await expect(page.locator("h3:has-text('Design Gallery')")).toBeVisible({ timeout: 15000 });

    // Click "Create Album" button
    await page.locator("button:has-text('Create First Album')").click();

    // Verify Modal
    const modal = page.locator(".ant-modal:has-text('Create Design Album')");
    await expect(modal).toBeVisible();

    // Fill in album details
    await modal.locator("input#name").fill("Temple Antique Jewellery");
    await modal.locator("textarea#description").fill("Exclusive 22K temple chokers and bridal haar collection");

    // Submit
    await modal.locator("button:has-text('Create Album')").click();

    // Verify the album card appears in the grid
    await expect(page.locator("text=Temple Antique Jewellery")).toBeVisible();
  });

  test("4. Navigates into album detail view and shows photos & customer presentation", async ({ page }) => {
    await setupAuthenticatedContext(page);

    await page.goto("/design-gallery");
    await expect(page.locator("text=Solitaire & Engagement Rings")).toBeVisible({ timeout: 15000 });

    // Click "Open" on the first album
    await page.locator(".ant-card:has-text('Solitaire & Engagement Rings') button:has-text('Open')").click();
    await page.waitForURL("**/design-gallery/album-1");

    // Breadcrumb and header check
    await expect(page.locator(".ant-breadcrumb")).toContainText("Design Gallery");
    await expect(page.locator("h3:has-text('Solitaire & Engagement Rings')")).toBeVisible();

    // Verify photos are visible
    await expect(page.locator("text=Classic 6-Prong Solitaire")).toBeVisible();
    await expect(page.locator("text=Halo Diamond Band")).toBeVisible();

    // Click "Customer Presentation" to launch presentation mode
    const presentBtn = page.locator("button:has-text('Customer Presentation')");
    await expect(presentBtn).toBeVisible();
    await presentBtn.click();

    // Ant Design Image Preview operations toolbar should be visible
    const previewOps = page.locator(".ant-image-preview-operations");
    await expect(previewOps).toBeVisible();

    // Close preview (press Escape)
    await page.keyboard.press("Escape");
    await expect(previewOps).not.toBeVisible();
  });

  test("5. Opens batch photo upload modal inside album view", async ({ page }) => {
    await setupAuthenticatedContext(page);

    await page.goto("/design-gallery/album-1");
    await expect(page.locator("h3:has-text('Solitaire & Engagement Rings')")).toBeVisible({ timeout: 15000 });

    // Click "Upload Designs" button
    await page.locator("button:has-text('Upload Designs')").click();

    // Verify Upload Modal opens
    const modal = page.locator(".ant-modal:has-text('Upload Design Photos')");
    await expect(modal).toBeVisible();
    await expect(modal.locator("text=Click or drag reference photos to this area")).toBeVisible();
  });
});
