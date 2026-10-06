-- Design Gallery: Category Albums & Design Photos showcase
-- Decoupled from active inventory; tied directly to auth.users

-- 1. Design Albums
create table if not exists public.design_albums (
    id                  uuid            primary key default gen_random_uuid(),
    user_id             uuid            references auth.users(id) on delete cascade not null,
    name                varchar(255)    not null,
    description         text,
    cover_image_url     text,
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null
);

create index if not exists idx_design_albums_user on public.design_albums(user_id);
create index if not exists idx_design_albums_name on public.design_albums(name);

alter table public.design_albums enable row level security;

create policy "Users can view their own design albums" on public.design_albums
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own design albums" on public.design_albums
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own design albums" on public.design_albums
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own design albums" on public.design_albums
  for delete using ((select auth.uid()) = user_id);

create trigger update_design_albums_updated_at before update on public.design_albums
  for each row execute function public.update_updated_at_column();

-- 2. Design Photos
create table if not exists public.design_photos (
    id                  uuid            primary key default gen_random_uuid(),
    album_id            uuid            references public.design_albums(id) on delete cascade not null,
    user_id             uuid            references auth.users(id) on delete cascade not null,
    image_url           text            not null,
    storage_path        text            not null,
    title               varchar(255),
    created_at          timestamp with time zone default now() not null
);

create index if not exists idx_design_photos_album on public.design_photos(album_id);
create index if not exists idx_design_photos_user on public.design_photos(user_id);

alter table public.design_photos enable row level security;

create policy "Users can view their own design photos" on public.design_photos
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own design photos" on public.design_photos
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own design photos" on public.design_photos
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own design photos" on public.design_photos
  for delete using ((select auth.uid()) = user_id);

-- 3. Storage Bucket Configuration
insert into storage.buckets (id, name, public)
values ('design-gallery-images', 'design-gallery-images', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload design gallery images"
  on storage.objects for insert
  with check (bucket_id = 'design-gallery-images' and auth.role() = 'authenticated');

create policy "Public can view design gallery images"
  on storage.objects for select
  using (bucket_id = 'design-gallery-images');

create policy "Users can delete their own design gallery images"
  on storage.objects for delete
  using (bucket_id = 'design-gallery-images' and (auth.uid() = owner));
