-- Migration: Add Sales Invoice Payments Ledger
-- Description: Supports partial advance payments at checkout, multi-installment recording over time, and balance snapshots.

create table if not exists public.invoice_payments (
    id                      uuid            primary key default gen_random_uuid(),
    shop_id                 uuid            references public.shops(id) on delete restrict not null,
    invoice_id              uuid            references public.invoices(id) on delete cascade not null,
    payment_date            date            default current_date not null,
    amount_paise            bigint          not null check (amount_paise > 0),
    payment_mode            varchar(50)     default 'CASH' not null,
    notes                   text,
    balance_snapshot_paise  bigint          not null,
    created_at              timestamp with time zone default now() not null,
    created_by              uuid            references auth.users(id)
);

create index if not exists idx_invoice_payments_invoice on public.invoice_payments(invoice_id, payment_date);
create index if not exists idx_invoice_payments_shop on public.invoice_payments(shop_id);

alter table public.invoice_payments enable row level security;

create policy "Users can view invoice payments for their shop" on public.invoice_payments
  for select using (
    exists (
      select 1 from public.shops
      where shops.id = invoice_payments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can insert invoice payments for their shop" on public.invoice_payments
  for insert with check (
    exists (
      select 1 from public.shops
      where shops.id = invoice_payments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can update invoice payments for their shop" on public.invoice_payments
  for update using (
    exists (
      select 1 from public.shops
      where shops.id = invoice_payments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );

create policy "Users can delete invoice payments for their shop" on public.invoice_payments
  for delete using (
    exists (
      select 1 from public.shops
      where shops.id = invoice_payments.shop_id
      and shops.user_id = (select auth.uid())
    )
  );
