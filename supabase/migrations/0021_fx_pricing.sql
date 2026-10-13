-- التسعير بالدولار أو الليرة، والعرض دائماً بالليرة السورية الجديدة (مقرّباً لأقرب 10)
create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.fx_settings (
  id integer primary key default 1 check (id = 1),
  usd_rate numeric(14,4) not null default 120,      -- ليرة جديدة لكل دولار
  auto boolean not null default true,                -- تحديث تلقائي من الإنترنت
  source text,
  updated_at timestamptz not null default now(),
  last_error text
);
insert into public.fx_settings (id) values (1) on conflict (id) do nothing;
alter table public.fx_settings enable row level security;
create policy "fx read" on public.fx_settings for select using (public.is_staff());

alter table public.products add column if not exists currency text not null default 'SYP' check (currency in ('SYP', 'USD'));
alter table public.products add column if not exists price_usd numeric(14,2);
alter table public.products add column if not exists compare_usd numeric(14,2);
alter table public.products add column if not exists cost_usd numeric(14,2);
alter table public.product_variants add column if not exists price_override_usd numeric(14,2);

create or replace function private.round10(n numeric) returns numeric language sql immutable set search_path = public as $$
  select case when n is null then null else greatest(round(n / 10) * 10, 0) end
$$;

-- عند حفظ منتج بالدولار: تُحسب الأسعار بالليرة تلقائياً
create or replace function private.products_fx()
returns trigger language plpgsql security definer set search_path = public as $$
declare r numeric;
begin
  if new.currency = 'USD' then
    select usd_rate into r from public.fx_settings where id = 1;
    new.price := coalesce(private.round10(new.price_usd * r), 0);
    new.compare_at_price := private.round10(new.compare_usd * r);
    new.cost := round(new.cost_usd * r, 2);           -- التكلفة بدقة (للأرباح)، بلا تقريب
  end if;
  return new;
end $$;
drop trigger if exists products_fx on public.products;
create trigger products_fx before insert or update on public.products for each row execute function private.products_fx();

create or replace function private.variants_fx()
returns trigger language plpgsql security definer set search_path = public as $$
declare r numeric; cur text;
begin
  select p.currency into cur from public.products p where p.id = new.product_id;
  if cur = 'USD' and new.price_override_usd is not null then
    select usd_rate into r from public.fx_settings where id = 1;
    new.price_override := private.round10(new.price_override_usd * r);
  end if;
  return new;
end $$;
drop trigger if exists variants_fx on public.product_variants;
create trigger variants_fx before insert or update on public.product_variants for each row execute function private.variants_fx();

-- تطبيق سعر صرف جديد على كل المنتجات المسعّرة بالدولار
create or replace function private.apply_fx(p_rate numeric, p_source text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_rate is null or p_rate <= 0 then raise exception 'سعر الصرف غير صحيح'; end if;
  update public.fx_settings set usd_rate = p_rate, source = p_source, updated_at = now(), last_error = null where id = 1;
  update public.products set price_usd = price_usd where currency = 'USD';          -- يعيد الحساب عبر المشغّل
  get diagnostics n = row_count;
  update public.product_variants v set price_override_usd = price_override_usd
    from public.products p where p.id = v.product_id and p.currency = 'USD' and v.price_override_usd is not null;
  return n;
end $$;

-- جلب السعر الآني من الإنترنت
create or replace function private.fx_refresh()
returns numeric language plpgsql security definer set search_path = public, extensions as $$
declare res extensions.http_response; r numeric;
begin
  begin
    select * into res from extensions.http_get('https://open.er-api.com/v6/latest/USD');
    r := ((res.content)::jsonb -> 'rates' ->> 'SYP')::numeric;
    if r is null or r <= 0 then raise exception 'لم يُعثر على سعر الليرة'; end if;
    if r > 1000 then r := r / 100; end if;   -- إن أعاد المصدر الليرة القديمة نحذف صفرين
    perform private.apply_fx(round(r, 4), 'open.er-api.com');
    return r;
  exception when others then
    update public.fx_settings set last_error = sqlerrm, updated_at = now() where id = 1;
    return null;
  end;
end $$;

-- للوحة الإدارة
create or replace function public.fx_set(p_rate numeric, p_auto boolean)
returns numeric language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'owner' and public.my_role() is distinct from 'accountant' then raise exception 'متاح للمدير والمحاسب فقط'; end if;
  update public.fx_settings set auto = coalesce(p_auto, auto) where id = 1;
  if coalesce(p_auto, false) then return private.fx_refresh(); end if;
  perform private.apply_fx(p_rate, 'يدوي');
  return p_rate;
end $$;

-- تحديث تلقائي كل ساعة
select cron.schedule('fx-refresh-hourly', '5 * * * *', $c$ select private.fx_refresh() where (select auto from public.fx_settings where id = 1) $c$);
