-- سجل موحّد للعملاء (محل + متجر) — رقم الهاتف هو المرجع
create or replace function private.norm_phone(p text)
returns text language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if d = '' then return null; end if;
  if d like '00%' then d := substr(d, 3); end if;
  if length(d) = 10 and d like '09%' then d := '963' || substr(d, 2); end if;   -- 09xxxxxxxx
  if length(d) = 9 and d like '9%' then d := '963' || d; end if;                 -- 9xxxxxxxx
  return d;
end $$;

create table if not exists public.customers (
  phone text primary key,
  name text,
  marketing_opt_in boolean not null default false,
  opt_in_at timestamptz,
  first_source text not null default 'store' check (first_source in ('store', 'online')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customers enable row level security;
create policy "customers staff read" on public.customers for select using (public.is_staff());
create policy "customers staff update" on public.customers for update using (public.is_staff()) with check (public.is_staff());

create or replace function private.upsert_customer(p_phone text, p_name text, p_source text, p_opt_in boolean default null)
returns text language plpgsql security definer set search_path = public as $$
declare ph text := private.norm_phone(p_phone);
begin
  if ph is null then return null; end if;
  insert into public.customers (phone, name, first_source, marketing_opt_in, opt_in_at)
  values (ph, nullif(trim(p_name), ''), p_source, coalesce(p_opt_in, false), case when p_opt_in then now() end)
  on conflict (phone) do update set
    name = coalesce(nullif(trim(excluded.name), ''), public.customers.name),
    marketing_opt_in = case when p_opt_in then true else public.customers.marketing_opt_in end,
    opt_in_at = case when p_opt_in and not public.customers.marketing_opt_in then now() else public.customers.opt_in_at end,
    updated_at = now();
  return ph;
end $$;

-- كل طلب: يوحّد رقم الهاتف (من الطلب أو من حساب العميلة) ويُسجّل العميلة
create or replace function private.orders_customer()
returns trigger language plpgsql security definer set search_path = public as $$
declare p_phone text; p_name text;
begin
  if new.user_id is not null then select phone, full_name into p_phone, p_name from public.profiles where id = new.user_id; end if;
  new.customer_phone := coalesce(private.norm_phone(new.customer_phone), private.norm_phone(p_phone),
                                 private.norm_phone(new.address_snapshot->>'phone'));
  if new.customer_phone is not null and tg_op = 'INSERT' then
    perform private.upsert_customer(new.customer_phone, coalesce(p_name, new.address_snapshot->>'name', new.address_snapshot->>'full_name'),
      case when new.channel = 'store' then 'store' else 'online' end, null);
  end if;
  return new;
end $$;
create trigger orders_customer before insert or update of customer_phone, user_id on public.orders
  for each row execute function private.orders_customer();

-- بيع في المحل مع اسم العميلة وموافقتها على التسويق
create or replace function public.pos_sale_v2(items jsonb, payment public.payment_method, discount_amount numeric, customer_phone_in text, customer_name_in text, marketing_in boolean)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders; ph text;
begin
  perform public.require_staff();
  ph := private.norm_phone(customer_phone_in);
  if ph is null or length(ph) < 9 then raise exception 'رقم هاتف العميلة مطلوب'; end if;
  if coalesce(trim(customer_name_in), '') = '' then raise exception 'اسم العميلة مطلوب'; end if;
  perform private.upsert_customer(ph, customer_name_in, 'store', coalesce(marketing_in, false));
  select * into o from public.pos_sale(items, payment, discount_amount, ph);
  return o;
end $$;

-- إحصاءات العملاء من القناتين
create or replace view public.customer_stats with (security_invoker = true) as
select c.phone, c.name, c.marketing_opt_in, c.opt_in_at, c.first_source, c.note, c.created_at,
  count(o.id) filter (where o.status <> 'cancelled') as orders_count,
  coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as spent,
  max(o.created_at) filter (where o.status <> 'cancelled') as last_order,
  coalesce(bool_or(o.channel = 'store'), false) as bought_store,
  coalesce(bool_or(o.channel <> 'store'), false) as bought_online
from public.customers c left join public.orders o on o.customer_phone = c.phone
group by c.phone;

-- تعبئة أولية من الحسابات والطلبات الموجودة
select private.upsert_customer(phone, full_name, 'online', null) from public.profiles where role = 'customer' and phone is not null;
update public.orders set customer_phone = customer_phone where customer_phone is not null or user_id is not null;

-- بيانات العميلة اختيارية (بعض الزبونات لا يرغبن بإعطائها)
create or replace function public.pos_sale_v2(items jsonb, payment public.payment_method, discount_amount numeric, customer_phone_in text, customer_name_in text, marketing_in boolean)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders; ph text;
begin
  perform public.require_staff();
  ph := private.norm_phone(customer_phone_in);
  if ph is not null and length(ph) < 9 then raise exception 'رقم الهاتف غير مكتمل'; end if;
  if ph is not null then perform private.upsert_customer(ph, customer_name_in, 'store', coalesce(marketing_in, false)); end if;
  select * into o from public.pos_sale(items, payment, discount_amount, ph);
  return o;
end $$;
