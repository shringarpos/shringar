# Design Gallery Specification

## 1. Overview & Business Intent
Jewellery retail owners frequently interact with walk-in customers who ask:
*"Can you make something like this?"* or *"What kind of antique temple rings or bridal chokers can you craft?"*

These reference designs are not part of physical store inventory. They are craft references, bespoke designs from past master goldsmiths, and design catalogs. 

The **Design Gallery** provides a dedicated, visually luxurious, distraction-free digital catalog directly in Shringar POS that owners can hand to or show customers on a tablet, laptop, or desktop.

## 2. Key Requirements
1. **Sidebar Navigation**:
   - Labeled **"Design Gallery"** (using a gallery/image icon like `Lucide.Images` or `Lucide.Camera` / `Lucide.Sparkles`).
   - Located conveniently in the sidebar navigation.
2. **Albums Hub (Landing View)**:
   - Starts with a clean empty state (no pre-seeded albums) with an inviting *"Create your first Design Album"* call-to-action.
   - Album creation modal: Album Name (e.g., "Solitaire & Engagement Rings", "Temple Chokers", "Antique Kadas"), optional description, and optional cover image.
   - Album Cards grid:
     - 4:3 / 16:9 thumbnail preview using the album's latest photo or chosen cover.
     - Album title, photo count badge (e.g. `14 Designs`), and last updated date.
     - Actions: Open Album, Edit Name/Details, Delete Album (with confirmation).
3. **Album Photo View (Gallery Showcase)**:
   - Header with breadcrumb / Back to Albums button, Album Name, photo count, and quick actions:
     - **[ Upload Photos ]**: Multi-file drag-and-drop uploader directly into the new Supabase bucket.
     - **[ Client Presentation / Slideshow ]**: High-resolution, full-screen customer presentation mode.
     - **[ Delete / Manage Photos ]**: Jeweller can remove outdated photos.
   - Photo Grid:
     - Responsive masonry / uniform aspect-ratio photo grid.
     - Hover actions: Quick preview, delete photo.
     - Clicking any photo opens Ant Design `<Image.PreviewGroup>` with zoom in/out, 90° rotation, full-screen toggle, and previous/next keyboard navigation.
4. **Storage & Data Schema**:
   - **Supabase Storage Bucket**: Dedicated public bucket `design-gallery-images`.
   - **Database Tables (PostgreSQL with RLS)**:
     - `public.design_albums`:
       - `id uuid primary key default gen_random_uuid()`
       - `user_id uuid references auth.users(id) on delete cascade not null`
       - `name varchar(255) not null`
       - `description text`
       - `cover_image_url text`
       - `created_at timestamp with time zone default now()`
       - `updated_at timestamp with time zone default now()`
     - `public.design_photos`:
       - `id uuid primary key default gen_random_uuid()`
       - `album_id uuid references public.design_albums(id) on delete cascade not null`
       - `user_id uuid references auth.users(id) on delete cascade not null`
       - `image_url text not null`
       - `storage_path text not null`
       - `title varchar(255)`
       - `created_at timestamp with time zone default now()`
   - Complete RLS policies ensuring each user only accesses their own design albums and photos.
5. **Theme & UX Cohesion**:
   - Supports both Dark and Light mode seamlessly using Shringar's theme variables.
   - Luxury jewellery aesthetic: refined card borders, golden accents, smooth transitions.
6. **Git / Deployment Constraint**:
   - Keep all changes staged and committed incrementally locally.
   - **DO NOT push to `origin/main`** until fully implemented, verified with tests, and explicitly authorized by the user.

## 3. Review & Verification
- Unit & E2E tests using Playwright simulating:
  1. Navigating to "Design Gallery" from sidebar.
  2. Viewing the empty state.
  3. Creating a new album (e.g. "Rings").
  4. Viewing the created album card.
  5. Navigating into the album and testing photo upload & image preview modal.
- `pnpm tsc --noEmit` and `pnpm build` pass with zero errors.
