-- Make full_name, phone, shop_name nullable in public.access_requests
ALTER TABLE public.access_requests ALTER COLUMN full_name DROP NOT NULL;
