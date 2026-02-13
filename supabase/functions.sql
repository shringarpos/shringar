-- Function to generate next customer code
create or replace function public.generate_customer_code(p_shop_id uuid)
returns varchar(20) as $$
declare
    v_shop_code  varchar(10);
    v_next_number int;
    v_customer_code varchar(20)
begin
    -- get shop code
    select code into v_shop_code from public.shops where id = p_shop_id;

    -- get next number
    select coalesce(max(substring(customer_code from length(v_shop_code) + 1)::int), 0) + 1
    into v_next_number
    from public.customers
    where shop_id = p_shop_id;

    -- generate customer code
    v_customer_code := v_shop_code || lpad(v_next_number::text, 3, '0');

    return v_customer_code;
end;
$$ language plpgsql security definer;


-- Function to generate next invoice number
create or replace function public.generate_invoice_number(p_shop_id uuid)
returns varchar(50) as $$
declare
  v_shop_code  varchar(10);
  v_next_number int;
  v_invoice_number varchar(50);
begin
    -- get shop code
    select code into v_shop_code from public.shops where id = p_shop_id;

    -- Get next number
    select coalesce(max(substring(invoice_number from 5)::int), 0) + 1
    into v_next_number
    from public.invoices
    where shop_id = p_shop_id;
    
    -- Generate invoice number
    v_invoice_number := v_shop_code || lpad(v_next_number::text, 6, '0');
    
    return v_invoice_number;
end;
$$ language plpgsql security definer;