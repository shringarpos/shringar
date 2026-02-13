
-- logos

insert into storage.buckets (id, name, public)
  values ('shop-logos', 'shop-logos', true);

create policy "Shop logos are publicly accessible" on storage.objects
  for select using (bucket_id = 'shop-logos');

create policy "Users can upload their shop logo" on storage.objects
  for insert with check (
    bucket_id = 'shop-logos' 
    and auth.role() = 'authenticated'
  );

create policy "Users can update their shop logo" on storage.objects
  for update using (
    bucket_id = 'shop-logos' 
    and auth.role() = 'authenticated'
  );

create policy "Users can delete their shop logo" on storage.objects
  for delete using (
    bucket_id = 'shop-logos' 
    and auth.role() = 'authenticated'
  );


-- category images


insert into storage.buckets (id, name, public)
  values ('category-images', 'category-images', true);

create policy "Category images are publicly accessible" on storage.objects
  for select using (bucket_id = 'category-images');

create policy "Users can upload category images" on storage.objects
  for insert with check (
    bucket_id = 'category-images' 
    and auth.role() = 'authenticated'
  );

create policy "Users can update category images" on storage.objects
  for update using (
    bucket_id = 'category-images' 
    and auth.role() = 'authenticated'
  );

create policy "Users can delete category images" on storage.objects
  for delete using (
    bucket_id = 'category-images' 
    and auth.role() = 'authenticated'
  );