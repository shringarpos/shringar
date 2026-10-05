-- Enable UUID and pgcrypto extensions
create extension if not exists "pgcrypto";

-- ===================================
-- | HELPER FUNCTIONS                |
-- ===================================

-- Update timestamp trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Helper function to check if user has system_admin role
create or replace function public.is_system_admin()
returns boolean as $$
begin
  return coalesce(
    (select (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_admin'),
    false
  );
end;
$$ language plpgsql security definer;


-- ===================================
-- | CONFIGURATION & SETTINGS TABLES |
-- ===================================

-- Shop Config
create table if not exists public.shops (
    id              uuid            primary key default gen_random_uuid(),
    user_id         uuid            references auth.users(id) on delete cascade not null,
    code            varchar(10)     unique not null,
    name            varchar(200)    not null,
    address         text            not null,
    phone           varchar(20)     not null,
    email           varchar(100),
    logo_url        text,
    gst_number      varchar(20),
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null,
    created_by      uuid            references auth.users(id),
    updated_by      uuid            references auth.users(id)
);

create index if not exists idx_shops_code on public.shops(code);
create index if not exists idx_shops_user_id on public.shops(user_id);

alter table public.shops enable row level security;

create policy "Users can view their own shop" on public.shops
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own shop" on public.shops
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own shop" on public.shops
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own shop" on public.shops
  for delete using ((select auth.uid()) = user_id);

create trigger update_shops_updated_at before update on public.shops
  for each row execute function public.update_updated_at_column();


-- Ornament Categories (Rings, Necklace, Bracelet etc)
create table if not exists public.ornament_categories (
    id          uuid            primary key default gen_random_uuid(),
    shop_id     uuid            references public.shops(id) on delete restrict not null,
    name        varchar(100)    not null,
    description text,
    image_url   text,
    is_active   boolean         default true not null,

    created_at  timestamp with time zone default now() not null,
    updated_at  timestamp with time zone default now() not null,
    created_by  uuid            references auth.users(id),
    updated_by  uuid            references auth.users(id)
);

create index if not exists idx_ornament_categories_shop on public.ornament_categories(shop_id);
create index if not exists idx_ornament_categories_active on public.ornament_categories(is_active);

alter table public.ornament_categories enable row level security;

create policy "Users can view categories from their shop" on public.ornament_categories
  for select using (
    exists (
      select 1 from public.shops
      where shops.id = ornament_categories.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert categories to their shop" on public.ornament_categories
  for insert with check (
    exists (
      select 1 from public.shops
      where shops.id = ornament_categories.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can update categories from their shop" on public.ornament_categories
  for update using (
    exists (
      select 1 from public.shops
      where shops.id = ornament_categories.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can delete categories from their shop" on public.ornament_categories
  for delete using (
    exists (
      select 1 from public.shops
      where shops.id = ornament_categories.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create trigger update_ornament_categories_updated_at before update on public.ornament_categories
  for each row execute function public.update_updated_at_column();


-- Metal Types Lookup (GOLD, SILVER)
create table if not exists public.metal_types (
    id            uuid        primary key default gen_random_uuid(),
    name          varchar(50) unique not null,
    is_active     boolean     default true not null,
    
    created_at    timestamp with time zone default now() not null,
    updated_at    timestamp with time zone default now() not null
);

create index if not exists idx_metal_types_name_active on public.metal_types(name, is_active);

alter table public.metal_types enable row level security;

create policy "Metal types are viewable by authenticated users" on public.metal_types
  for select using (auth.role() = 'authenticated');

create policy "Metal types can be inserted by authenticated users" on public.metal_types
  for insert with check (auth.role() = 'authenticated');

create policy "Metal types can be updated by authenticated users" on public.metal_types
  for update using (auth.role() = 'authenticated');

create trigger update_metal_types_updated_at before update on public.metal_types
  for each row execute function public.update_updated_at_column();


-- Purity Levels 
create table if not exists public.purity_levels (
    id              uuid        primary key default gen_random_uuid(),
    metal_type_id   uuid        references public.metal_types(id) on delete restrict not null,
    purity_value    int         not null,
    display_name    varchar(20) not null,
    is_active       boolean     default true not null,
    
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null,
    
    constraint unique_metal_purity unique (metal_type_id, purity_value)
);

create index if not exists idx_purity_levels_metal_active on public.purity_levels(metal_type_id, is_active);

alter table public.purity_levels enable row level security;

create policy "Purity levels are viewable by authenticated users" on public.purity_levels
  for select using (auth.role() = 'authenticated');

create policy "Purity levels can be inserted by authenticated users" on public.purity_levels
  for insert with check (auth.role() = 'authenticated');

create policy "Purity levels can be updated by authenticated users" on public.purity_levels
  for update using (auth.role() = 'authenticated');

create trigger update_purity_levels_updated_at before update on public.purity_levels
  for each row execute function public.update_updated_at_column();


-- Making Charges Configuration
create table if not exists public.making_charges (
    id                      uuid        primary key default gen_random_uuid(),
    shop_id                 uuid        references public.shops(id) on delete restrict not null,
    metal_type_id           uuid        references public.metal_types(id) on delete restrict not null,
    purity_level_id         uuid        references public.purity_levels(id) on delete restrict not null,
    charge_per_gram_paise   bigint      not null,
    effective_from          timestamp with time zone default now() not null,
    effective_to            timestamp with time zone,
    is_active               boolean     default true not null,

    created_at              timestamp with time zone default now() not null,
    updated_at              timestamp with time zone default now() not null,
    created_by              uuid        references auth.users(id),
    updated_by              uuid        references auth.users(id)
);

create index if not exists idx_making_charges_shop on public.making_charges(shop_id);
create index if not exists idx_making_charges_metal_active on public.making_charges(metal_type_id, is_active, effective_from);
create index if not exists idx_making_charges_effective on public.making_charges(effective_from, effective_to);

alter table public.making_charges enable row level security;

create policy "Users can view making charges from their shop" on public.making_charges
  for select using (
    exists (
      select 1 from public.shops
      where shops.id = making_charges.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert making charges to their shop" on public.making_charges
  for insert with check (
    exists (
      select 1 from public.shops
      where shops.id = making_charges.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can update making charges from their shop" on public.making_charges
  for update using (
    exists (
      select 1 from public.shops
      where shops.id = making_charges.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can delete making charges from their shop" on public.making_charges
  for delete using (
    exists (
      select 1 from public.shops
      where shops.id = making_charges.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create trigger update_making_charges_updated_at before update on public.making_charges
  for each row execute function public.update_updated_at_column();


-- =================
-- | MASTER TABLES |
-- =================

-- Customers
create table if not exists public.customers (
    id               uuid         primary key default gen_random_uuid(),
    shop_id          uuid         references public.shops(id) on delete restrict not null,
    customer_code    varchar(20)  not null,
    name             varchar(200) not null,
    address          text         not null,
    phone            varchar(20)  not null,
    email            varchar(100),
    alternate_phone  varchar(20),
    reference_by     uuid         references public.customers(id) on delete set null,
    is_active        boolean      default true not null,

    created_at       timestamp with time zone default now() not null,
    updated_at       timestamp with time zone default now() not null,
    created_by       uuid         references auth.users(id),
    updated_by       uuid         references auth.users(id),

    constraint unique_shop_customer_code unique (shop_id, customer_code)
);

create index if not exists idx_customers_shop on public.customers(shop_id);
create index if not exists idx_customers_shop_code on public.customers(shop_id, customer_code);
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_customers_active on public.customers(is_active);
create index if not exists idx_customers_reference_by on public.customers(reference_by);

alter table public.customers enable row level security;

create policy "Users can view customers from their shop" on public.customers
  for select using (
    exists (
      select 1 from public.shops
      where shops.id = customers.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert customers to their shop" on public.customers
  for insert with check (
    exists (
      select 1 from public.shops
      where shops.id = customers.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can update customers from their shop" on public.customers
  for update using (
    exists (
      select 1 from public.shops
      where shops.id = customers.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can delete customers from their shop" on public.customers
  for delete using (
    exists (
      select 1 from public.shops
      where shops.id = customers.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create trigger update_customers_updated_at before update on public.customers
  for each row execute function public.update_updated_at_column();


-- Ornaments
create table if not exists public.ornaments (
    id                           uuid         primary key default gen_random_uuid(),
    shop_id                      uuid         references public.shops(id) on delete restrict not null,
    category_id                  uuid         references public.ornament_categories(id) on delete restrict not null,
    metal_type_id                uuid         references public.metal_types(id) on delete restrict not null,
    purity_level_id              uuid         references public.purity_levels(id) on delete restrict not null,
    name                         varchar(200) not null,
    weight_mg                    bigint       not null,
    quantity                     int          default 0 not null,
    
    purchase_metal_rate_paise    bigint,
    purchase_making_charge_paise bigint,
    purchase_total_cost_paise    bigint,
    purchase_date                date,

    sku                          varchar(50),
    description                  text,
    is_active                    boolean      default true not null,

    created_at                   timestamp with time zone default now() not null,
    updated_at                   timestamp with time zone default now() not null,
    created_by                   uuid         references auth.users(id),
    updated_by                   uuid         references auth.users(id),

    constraint unique_shop_ornament_sku unique (shop_id, sku)
);

create index if not exists idx_ornaments_shop on public.ornaments(shop_id);
create index if not exists idx_ornaments_category_metal on public.ornaments(category_id, metal_type_id, is_active);
create index if not exists idx_ornaments_metal_purity on public.ornaments(metal_type_id, purity_level_id);
create index if not exists idx_ornaments_sku on public.ornaments(sku);

alter table public.ornaments enable row level security;

create policy "Users can view ornaments from their shop" on public.ornaments
  for select using (
    exists (
      select 1 from public.shops
      where shops.id = ornaments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert ornaments to their shop" on public.ornaments
  for insert with check (
    exists (
      select 1 from public.shops
      where shops.id = ornaments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can update ornaments from their shop" on public.ornaments
  for update using (
    exists (
      select 1 from public.shops
      where shops.id = ornaments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can delete ornaments from their shop" on public.ornaments
  for delete using (
    exists (
      select 1 from public.shops
      where shops.id = ornaments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create trigger update_ornaments_updated_at before update on public.ornaments
  for each row execute function public.update_updated_at_column();


-- Daily Ornament Rates (Gold/Silver rates per gram)
create table if not exists public.ornament_rates (
    id                  uuid        primary key default gen_random_uuid(),
    shop_id             uuid        references public.shops(id) on delete restrict not null,
    metal_type_id       uuid        references public.metal_types(id) on delete restrict not null,
    rate_date           date        default current_date not null,
    rate_per_gram_paise bigint      not null,

    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null,
    created_by          uuid        references auth.users(id),
    updated_by          uuid        references auth.users(id),

    constraint unique_metal_rate_date unique (shop_id, metal_type_id, rate_date)
);

create index if not exists idx_ornament_rates_shop on public.ornament_rates(shop_id);
create index if not exists idx_ornament_rates_date on public.ornament_rates(rate_date, metal_type_id);

alter table public.ornament_rates enable row level security;

create policy "Users can view rates from their shop" on public.ornament_rates
  for select using (
    exists (
      select 1 from public.shops
      where shops.id = ornament_rates.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert rates to their shop" on public.ornament_rates
  for insert with check (
    exists (
      select 1 from public.shops
      where shops.id = ornament_rates.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can update rates from their shop" on public.ornament_rates
  for update using (
    exists (
      select 1 from public.shops
      where shops.id = ornament_rates.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can delete rates from their shop" on public.ornament_rates
  for delete using (
    exists (
      select 1 from public.shops
      where shops.id = ornament_rates.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create trigger update_ornament_rates_updated_at before update on public.ornament_rates
  for each row execute function public.update_updated_at_column();


-- =============================
-- | TRANSACTIONAL DATA TABLES |
-- =============================

-- Invoices Header
create table if not exists public.invoices (
    id                          uuid            primary key default gen_random_uuid(),
    shop_id                     uuid            references public.shops(id) on delete restrict not null,
    customer_id                 uuid            references public.customers(id) on delete restrict not null,
    invoice_number              varchar(50)     not null,
    invoice_date                date            default current_date not null,

    subtotal_amount_paise       bigint          not null,
    total_making_charges_paise  bigint          not null,
    discount_amount_paise       bigint          default 0 not null,
    total_amount_paise          bigint          not null,

    notes                       text,
    is_cancelled                boolean         default false not null,
    cancelled_at                timestamp with time zone,
    cancelled_by                uuid            references auth.users(id),
    cancelled_reason            text,

    created_at                  timestamp with time zone default now() not null,
    updated_at                  timestamp with time zone default now() not null,
    created_by                  uuid            references auth.users(id),
    updated_by                  uuid            references auth.users(id),

    constraint unique_shop_invoice_number unique (shop_id, invoice_number)
);

create index if not exists idx_invoices_shop_date on public.invoices(shop_id, invoice_date);
create index if not exists idx_invoices_customer_date on public.invoices(customer_id, invoice_date);
create index if not exists idx_invoices_number on public.invoices(invoice_number);
create index if not exists idx_invoices_cancelled on public.invoices(is_cancelled);

alter table public.invoices enable row level security;

create policy "Users can view invoices from their shop" on public.invoices
  for select using (
    exists (
      select 1 from public.shops
      where shops.id = invoices.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert invoices to their shop" on public.invoices
  for insert with check (
    exists (
      select 1 from public.shops
      where shops.id = invoices.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can update invoices from their shop" on public.invoices
  for update using (
    exists (
      select 1 from public.shops
      where shops.id = invoices.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can delete invoices from their shop" on public.invoices
  for delete using (
    exists (
      select 1 from public.shops
      where shops.id = invoices.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create trigger update_invoices_updated_at before update on public.invoices
  for each row execute function public.update_updated_at_column();


-- Invoice Line Items
create table if not exists public.invoice_items (
    id                           uuid        primary key default gen_random_uuid(),
    invoice_id                   uuid        references public.invoices(id) on delete cascade not null,
    ornament_id                  uuid        references public.ornaments(id) on delete restrict not null,
    item_name                    varchar(200) not null,
    weight_mg                    bigint      not null,
    quantity                     int         default 1 not null,

    metal_type_name              varchar(50) not null,
    purity_value                 int,
    purity_display_name          varchar(20),

    rate_per_gram_paise          bigint      not null,
    making_charge_per_gram_paise bigint      not null,

    metal_amount_paise           bigint      not null,
    making_charge_amount_paise   bigint      not null,
    line_total_paise             bigint      not null,

    created_at                   timestamp with time zone default now() not null,
    updated_at                   timestamp with time zone default now() not null
);

create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index if not exists idx_invoice_items_ornament on public.invoice_items(ornament_id);

alter table public.invoice_items enable row level security;

create policy "Users can view invoice items from their shop" on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices
      join public.shops on shops.id = invoices.shop_id
      where invoices.id = invoice_items.invoice_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert invoice items to their shop invoices" on public.invoice_items
  for insert with check (
    exists (
      select 1 from public.invoices
      join public.shops on shops.id = invoices.shop_id
      where invoices.id = invoice_items.invoice_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can update invoice items from their shop" on public.invoice_items
  for update using (
    exists (
      select 1 from public.invoices
      join public.shops on shops.id = invoices.shop_id
      where invoices.id = invoice_items.invoice_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can delete invoice items from their shop" on public.invoice_items
  for delete using (
    exists (
      select 1 from public.invoices
      join public.shops on shops.id = invoices.shop_id
      where invoices.id = invoice_items.invoice_id
      and shops.user_id = (select auth.uid())
    )
  );

create trigger update_invoice_items_updated_at before update on public.invoice_items
  for each row execute function public.update_updated_at_column();


-- ===================================
-- | CODE GENERATION FUNCTIONS       |
-- ===================================

create or replace function public.generate_customer_code(p_shop_id uuid)
returns varchar(20)
language plpgsql
security definer
as $$
declare
    v_shop_code varchar(10);
    v_count bigint;
begin
    select code into v_shop_code from public.shops where id = p_shop_id;
    if v_shop_code is null then
        raise exception 'Invalid shop id';
    end if;

    select coalesce(count(*), 0) + 1 into v_count
    from public.customers
    where shop_id = p_shop_id;

    return v_shop_code || lpad(v_count::text, 3, '0');
end;
$$;

create or replace function public.generate_invoice_number(p_shop_id uuid)
returns varchar(50)
language plpgsql
security definer
as $$
declare
    v_shop_code varchar(10);
    v_count bigint;
begin
    select code into v_shop_code from public.shops where id = p_shop_id;
    if v_shop_code is null then
        raise exception 'Invalid shop id';
    end if;

    select coalesce(count(*), 0) + 1 into v_count
    from public.invoices
    where shop_id = p_shop_id;

    return v_shop_code || lpad(v_count::text, 6, '0');
end;
$$;

create or replace function public.trigger_generate_customer_code()
returns trigger
language plpgsql
security definer
as $$
begin
    if new.customer_code is null or new.customer_code = '' then
        new.customer_code := public.generate_customer_code(new.shop_id);
    end if;
    return new;
end;
$$;

create or replace trigger trg_customers_generate_code
before insert on public.customers
for each row
execute function public.trigger_generate_customer_code();

create or replace function public.trigger_generate_invoice_number()
returns trigger
language plpgsql
security definer
as $$
begin
    if new.invoice_number is null or new.invoice_number = '' then
        new.invoice_number := public.generate_invoice_number(new.shop_id);
    end if;
    return new;
end;
$$;

create or replace trigger trg_invoices_generate_number
before insert on public.invoices
for each row
execute function public.trigger_generate_invoice_number();


-- ===================================
-- | STORAGE BUCKETS CONFIGURATION   |
-- ===================================

insert into storage.buckets (id, name, public)
values 
  ('shop-logos', 'shop-logos', true),
  ('category-images', 'category-images', true)
on conflict (id) do nothing;

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
