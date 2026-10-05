-- Gold Ledger Loans table: Completely decoupled from POS tables, strictly tied to auth.users
create table if not exists public.gold_loans (
    id                  uuid            primary key default gen_random_uuid(),
    user_id             uuid            references auth.users(id) on delete cascade not null,

    -- Customer Details
    customer_name       varchar(200)    not null,
    contact_no          varchar(20)     not null,
    address             text            not null,
    nominee             varchar(200)    not null,

    -- Collateral Details
    metal_type          varchar(50)     not null, -- 'Gold', 'Silver'
    purity              varchar(20)     not null, -- '24K', '22K', '18K', '14K', '99.9%', '92.5%', 'Custom'
    ornament_details    text            not null,

    -- Financial Details
    loan_date           date            default current_date not null,
    closure_date        date,
    loan_amount         numeric(12,2)   not null,
    duration_months     int             not null,
    interest_rate       numeric(5,2)    not null,
    interest_amount     numeric(12,2)   not null,
    total_amount        numeric(12,2)   not null,
    status              varchar(20)     default 'running' not null, -- 'running' | 'closed'

    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null
);

create index if not exists idx_gold_loans_user on public.gold_loans(user_id);
create index if not exists idx_gold_loans_status on public.gold_loans(status);
create index if not exists idx_gold_loans_metal on public.gold_loans(metal_type);
create index if not exists idx_gold_loans_date on public.gold_loans(loan_date);

alter table public.gold_loans enable row level security;

create policy "Users can view their own gold loans" on public.gold_loans
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own gold loans" on public.gold_loans
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own gold loans" on public.gold_loans
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own gold loans" on public.gold_loans
  for delete using ((select auth.uid()) = user_id);

create trigger update_gold_loans_updated_at before update on public.gold_loans
  for each row execute function public.update_updated_at_column();
