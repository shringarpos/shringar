
create or replace function public.generate_customer_code(p_shop_id uuid)
returns varchar(20)
language plpgsql
security definer
as $$
declare
    v_shop_code varchar(10);
    v_seq_name text;
    v_next_number bigint;
begin
    -- Get shop code
    select code into v_shop_code
    from public.shops
    where id = p_shop_id;

    if v_shop_code is null then
        raise exception 'Invalid shop id';
    end if;

    -- Build sequence name
    v_seq_name := 'customer_seq_' || lower(v_shop_code);

    -- Create sequence if not exists
    execute format(
        'create sequence if not exists public.%I',
        v_seq_name
    );

    -- Get next value
    execute format(
        'select nextval(''public.%I'')',
        v_seq_name
    )
    into v_next_number;

    return v_shop_code || lpad(v_next_number::text, 3, '0');
end;
$$;


create or replace function public.generate_invoice_number(p_shop_id uuid)
returns varchar(50)
language plpgsql
security definer
as $$
declare
    v_shop_code varchar(10);
    v_seq_name text;
    v_next_number bigint;
begin
    select code into v_shop_code
    from public.shops
    where id = p_shop_id;

    if v_shop_code is null then
        raise exception 'Invalid shop id';
    end if;

    v_seq_name := 'invoice_seq_' || lower(v_shop_code);

    execute format(
        'create sequence if not exists public.%I',
        v_seq_name
    );

    execute format(
        'select nextval(''public.%I'')',
        v_seq_name
    )
    into v_next_number;

    return v_shop_code || lpad(v_next_number::text, 6, '0');
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

create trigger trg_customers_generate_code
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

create trigger trg_invoices_generate_number
before insert on public.invoices
for each row
execute function public.trigger_generate_invoice_number();


create unique index if not exists customers_customer_code_key
on public.customers(customer_code);

create unique index if not exists invoices_invoice_number_key
on public.invoices(invoice_number);