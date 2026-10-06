# Design Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a luxury "Design Gallery" lookbook in Shringar POS where jewellers can create category-based design albums, batch-upload reference photos to a dedicated Supabase bucket, and showcase designs to walk-in customers in an immersive lightbox presentation.

**Architecture:** 
- Decoupled from inventory tables; backed by two new PostgreSQL tables (`public.design_albums` and `public.design_photos`) with full RLS.
- Dedicated Supabase Storage bucket (`design-gallery-images`) with helper functions for batch image uploads.
- React/Ant Design views:
  - Album Listing Hub with empty state, album creation/editing drawer/modal, and album cards.
  - Album Detail View displaying photos in a responsive grid with Ant Design `<Image.PreviewGroup>` lightbox, multi-file uploader, and photo deletion.
  - Sidebar entry under "Design Gallery" with `Lucide.Images`.

**Tech Stack:** React 19, Refine v4, Ant Design v5, Supabase JS (Auth & Storage & PostgREST), Lucide React, Playwright E2E.

**Spec:** [`docs/specs/design-gallery.md`](file:///home/sahil/Shringar/docs/specs/design-gallery.md)

## Global Constraints
- Keep all git commits local (`git commit`) with author `Sahil Khude <sahilkhude11@gmail.com>`.
- **DO NOT push to `origin/main`** under any circumstance until the user explicitly commands it.
- Maintain dark/light theme consistency across all new cards, modals, and preview lightboxes.
- All code must pass `pnpm tsc --noEmit` and `pnpm build`.

## Review Focus
1. Non-image or corrupted file drops in multi-upload -> only accept JPG/PNG/WEBP with file size limits.
2. Deleting an album cascades deletion of all its photos and cleans up storage files.
3. Empty album states gracefully guide the user to upload their first design photo.
4. Switching between dark and light mode does not wash out album card text or lightbox background.
5. Large image sets render smoothly without blocking main thread.

---

### Task 1: Supabase Schema Migration & TypeScript Interfaces

**Files:**
- Create: `supabase/migrations/20261006180000_add_design_gallery.sql`
- Modify: `src/libs/interfaces.ts`

- [ ] **Step 1:** Write the SQL migration creating `public.design_albums`, `public.design_photos`, indexes, RLS policies, and storage bucket configuration.
- [ ] **Step 2:** Add TypeScript interfaces `IDesignAlbum` and `IDesignPhoto` in `src/libs/interfaces.ts`.
- [ ] **Step 3:** Verify typecheck passes with `pnpm tsc --noEmit`.
- [ ] **Step 4:** Commit changes locally (`feat(gallery): add database schema and typescript interfaces`).

---

### Task 2: Supabase Storage Helper for Design Gallery

**Files:**
- Create: `src/utils/gallery-storage.ts`
- Modify: `src/components/upload-image.tsx` (if needed for shared helper reuse)

- [ ] **Step 1:** Create `src/utils/gallery-storage.ts` with methods:
  - `uploadDesignPhoto(file: File | RcFile, albumId: string): Promise<{ publicUrl: string, storagePath: string }>`
  - `deleteDesignPhoto(storagePath: string): Promise<void>`
  - `BUCKET_NAME = "design-gallery-images"`
- [ ] **Step 2:** Ensure graceful fallback/mock handling for local tests and offline scenarios.
- [ ] **Step 3:** Commit changes locally (`feat(gallery): add design gallery storage upload and delete helpers`).

---

### Task 3: Design Gallery Album Creation & Edit Modal

**Files:**
- Create: `src/components/design-gallery/album-modal.tsx`

- [ ] **Step 1:** Build `AlbumModal` with Ant Design `Modal` + `Form`:
  - Fields: Album Name (required), Description (optional), Optional Cover Image.
  - Theme-aware styles matching inventory category modal.
- [ ] **Step 2:** Support both `action="create"` and `action="edit"`.
- [ ] **Step 3:** Test component builds cleanly with `pnpm tsc --noEmit`.
- [ ] **Step 4:** Commit changes locally (`feat(gallery): add album creation and editing modal`).

---

### Task 4: Album Listing Hub & Empty State (Main Page)

**Files:**
- Create: `src/pages/design-gallery/index.tsx`
- Modify: `src/App.tsx` (add Route and Refine resource)

- [ ] **Step 1:** Build `DesignGallery` landing page with:
  - Header with title "Design Gallery", subtitle "Bespoke & Catalogue References for Customers", and "+ Create Album" button.
  - Empty state when no albums exist, prompting user to create their first album.
  - Responsive cards grid for albums showing cover photo, title, photo count badge, and quick action dropdown (Open, Edit, Delete).
- [ ] **Step 2:** Register the resource in `src/App.tsx` under route `/design-gallery` with `Images` icon in sidebar.
- [ ] **Step 3:** Test build with `pnpm tsc --noEmit`.
- [ ] **Step 4:** Commit changes locally (`feat(gallery): implement albums hub page and navigation route`).

---

### Task 5: Album Detail View & High-Res Presentation Grid

**Files:**
- Create: `src/pages/design-gallery/album-show.tsx`
- Modify: `src/App.tsx` (add Route `/design-gallery/:id`)

- [ ] **Step 1:** Build `AlbumShowPage`:
  - Breadcrumb navigation: `< Design Gallery / [Album Name]`.
  - Batch upload zone (drag and drop multiple images at once) with upload progress.
  - Photos grid:
    - High-quality hover effect, delete photo button with confirm popover.
    - Ant Design `<Image.PreviewGroup>` enabling full-screen slide presentation mode for clients with zoom, rotate, and arrow navigation.
  - Empty state when album has no photos yet: "No designs uploaded yet. Drag & drop reference photos here."
- [ ] **Step 2:** Register route `/design-gallery/:id` in `src/App.tsx`.
- [ ] **Step 3:** Verify build with `pnpm tsc --noEmit`.
- [ ] **Step 4:** Commit changes locally (`feat(gallery): implement album detail view with batch uploader and presentation mode`).

---

### Task 6: E2E Tests & Playwright Mock Data

**Files:**
- Modify: `e2e/fixtures/mock-auth.ts` (add mock routes for `design_albums`, `design_photos`, and storage)
- Create: `e2e/design-gallery.spec.ts`

- [ ] **Step 1:** Update `e2e/fixtures/mock-auth.ts` to mock Supabase tables `design_albums` and `design_photos` and storage bucket calls.
- [ ] **Step 2:** Write comprehensive E2E tests in `e2e/design-gallery.spec.ts`:
  - 1. Sidebar contains "Design Gallery" and routes cleanly.
  - 2. Empty state renders when no albums exist.
  - 3. Can create a new album ("Solitaire Rings").
  - 4. Can navigate into album and see photos / upload trigger.
  - 5. Can preview photos in full-screen presentation lightbox.
  - 6. Can delete a photo and an album.
- [ ] **Step 3:** Run `npx playwright test e2e/design-gallery.spec.ts` and ensure 100% pass rate.
- [ ] **Step 4:** Run full suite `pnpm test:e2e` to ensure zero regressions across existing POS features.
- [ ] **Step 5:** Commit changes locally (`test(gallery): add comprehensive e2e tests for design gallery`).

---

### Task 7: Full Verification & Final Review

- [ ] **Step 1:** Run `pnpm build` (`tsc && refine build`).
- [ ] **Step 2:** Confirm `git status` shows all commits staged and unpushed to `origin/main`.
- [ ] **Step 3:** Present completed feature summary and screenshots to the user.
