-- شغلات بنات — المخطط الأساسي (المرحلة 1)
-- الكتالوج، المخزون الموحّد لكل موقع، العميلات، العناوين، المفضلة، الطلبات، الكوبونات، البانرات.

create extension if not exists pgcrypto;

-- ───────── الأدوار والملفات ─────────
create type public.app_role as enum ('customer', 'owner', 'sales', 'inventory', 'accountant', 'cashier');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique,
  email text,
  birth_date date,
  usual_size text,
  role public.app_role not null default 'customer',
  points integer not null default 0,
  created_at timestamptz not null default now()
);

-- هل المستخدم الحالي من فريق العمل؟
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role <> 'customer');
$$;

create or replace function public.my_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- إنشاء ملف تلقائياً عند التسجيل
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, email, full_name)
  values (new.id, new.phone, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── الكتالوج ─────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_en text,
  image_url text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  name_en text,
  subtitle text,
  description text,
  price numeric(14,2) not null check (price >= 0),
  compare_at_price numeric(14,2) check (compare_at_price >= 0),
  cost numeric(14,2) check (cost >= 0),
  tag text,
  images text[] not null default '{}',
  rating numeric(2,1) not null default 0,
  rating_count integer not null default 0,
  is_online boolean not null default true,
  is_in_store boolean not null default true,
  sold_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  barcode text unique,
  size text,
  color_name text,
  color_hex text,
  price_override numeric(14,2),
  created_at timestamptz not null default now()
);

-- ───────── المخزون ─────────
create type public.location_kind as enum ('store', 'warehouse', 'transit');

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.location_kind not null,
  address text,
  sells_online boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.stock_levels (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  on_hand integer not null default 0,
  reserved integer not null default 0,
  reorder_point integer not null default 5,
  primary key (variant_id, location_id)
);

create type public.movement_kind as enum ('in', 'out', 'transfer', 'return', 'adjust', 'reserve', 'release');

create table public.stock_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id),
  from_location uuid references public.locations(id),
  to_location uuid references public.locations(id),
  qty integer not null,
  kind public.movement_kind not null,
  reference text,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- المتاح للبيع أونلاين لكل متغير (من المواقع المسموح بيعها أونلاين)
create or replace view public.variant_availability with (security_invoker = true) as
select v.id as variant_id, v.product_id,
       coalesce(sum(greatest(s.on_hand - s.reserved, 0)) filter (where l.sells_online), 0)::int as online_available
from public.product_variants v
left join public.stock_levels s on s.variant_id = v.id
left join public.locations l on l.id = s.location_id
group by v.id, v.product_id;

-- ───────── العميلات ─────────
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'المنزل',
  city text not null,
  street text not null,
  recipient_phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ───────── التسويق ─────────
create type public.discount_kind as enum ('percent', 'fixed', 'free_shipping');

create table public.coupons (
  code text primary key,
  description text,
  kind public.discount_kind not null,
  value numeric(14,2) not null default 0,
  min_order numeric(14,2) not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  channel text not null default 'all' check (channel in ('all', 'online', 'store')),
  is_active boolean not null default true
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  kicker text,
  title text not null,
  image_url text,
  link text,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- ───────── الطلبات ─────────
create type public.order_status as enum ('new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned');
create type public.order_channel as enum ('online', 'store');
create type public.payment_method as enum ('cod', 'card', 'transfer', 'cash');

create table public.shipping_methods (
  code text primary key,
  name text not null,
  description text,
  price numeric(14,2) not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create sequence public.order_number_seq start 20001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('SB-' || nextval('public.order_number_seq')),
  user_id uuid references public.profiles(id),
  channel public.order_channel not null default 'online',
  status public.order_status not null default 'new',
  payment_method public.payment_method not null default 'cod',
  is_paid boolean not null default false,
  address_snapshot jsonb,
  shipping_code text references public.shipping_methods(code),
  subtotal numeric(14,2) not null default 0,
  shipping numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  coupon_code text references public.coupons(code),
  note text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,
  variant_label text,
  unit_price numeric(14,2) not null,
  qty integer not null check (qty > 0),
  location_id uuid references public.locations(id)
);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null default 'order' check (kind in ('order', 'offer', 'new')),
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.products (category_id);
create index on public.product_variants (product_id);
create index on public.orders (user_id, created_at desc);
create index on public.order_items (order_id);
create index on public.stock_movements (variant_id, created_at desc);
create index on public.notifications (user_id, created_at desc);

-- ───────── إنشاء الطلب (ذرّياً مع حجز المخزون) ─────────
-- items: [{"variant_id": "...", "qty": 2}, ...]
create or replace function public.place_order(
  items jsonb,
  address_id uuid,
  shipping_code text,
  payment public.payment_method default 'cod',
  coupon text default null,
  note text default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  o public.orders;
  it jsonb;
  v record;
  loc uuid;
  sub numeric := 0;
  ship numeric := 0;
  disc numeric := 0;
  c public.coupons;
  addr jsonb;
  free_ship_threshold constant numeric := 300;
begin
  if uid is null then raise exception 'يجب تسجيل الدخول لإتمام الطلب'; end if;
  if jsonb_array_length(items) = 0 then raise exception 'السلة فارغة'; end if;

  select to_jsonb(a) - 'user_id' into addr from public.addresses a where a.id = address_id and a.user_id = uid;
  if addr is null then raise exception 'العنوان غير موجود'; end if;

  select price into ship from public.shipping_methods where code = shipping_code and is_active;
  if ship is null then raise exception 'طريقة الشحن غير متاحة'; end if;

  insert into public.orders (user_id, payment_method, address_snapshot, shipping_code, note)
  values (uid, payment, addr, shipping_code, note) returning * into o;

  for it in select * from jsonb_array_elements(items) loop
    select pv.id, p.name, coalesce(pv.price_override, p.price) as price,
           concat_ws(' · ', nullif(pv.size, ''), nullif(pv.color_name, '')) as label
      into v
      from public.product_variants pv join public.products p on p.id = pv.product_id
     where pv.id = (it->>'variant_id')::uuid and p.is_online;
    if v.id is null then raise exception 'منتج غير متاح'; end if;

    -- الموقع الذي فيه كمية كافية: المستودع أولاً ثم المحل
    select s.location_id into loc
      from public.stock_levels s join public.locations l on l.id = s.location_id
     where s.variant_id = v.id and l.sells_online and s.on_hand - s.reserved >= (it->>'qty')::int
     order by (l.kind = 'warehouse') desc
     limit 1
     for update of s;
    if loc is null then raise exception 'الكمية المطلوبة من "%" غير متوفرة', v.name; end if;

    update public.stock_levels set reserved = reserved + (it->>'qty')::int
     where variant_id = v.id and location_id = loc;
    insert into public.stock_movements (variant_id, from_location, qty, kind, reference, created_by)
    values (v.id, loc, (it->>'qty')::int, 'reserve', o.number, uid);

    insert into public.order_items (order_id, variant_id, product_name, variant_label, unit_price, qty, location_id)
    values (o.id, v.id, v.name, v.label, v.price, (it->>'qty')::int, loc);
    sub := sub + v.price * (it->>'qty')::int;
  end loop;

  if coupon is not null and coupon <> '' then
    select * into c from public.coupons
     where upper(code) = upper(coupon) and is_active and channel in ('all', 'online')
       and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
       and (max_uses is null or used_count < max_uses) and sub >= min_order;
    if c.code is null then raise exception 'كود الخصم غير صالح'; end if;
    if c.kind = 'percent' then disc := round(sub * c.value / 100, 2);
    elsif c.kind = 'fixed' then disc := least(c.value, sub);
    else ship := 0; end if;
    update public.coupons set used_count = used_count + 1 where code = c.code;
  end if;

  if sub >= free_ship_threshold and shipping_code = 'standard' then ship := 0; end if;

  update public.orders
     set subtotal = sub, shipping = ship, discount = disc, total = sub + ship - disc,
         coupon_code = c.code
   where id = o.id returning * into o;

  insert into public.order_events (order_id, status, note) values (o.id, 'new', 'تم استلام الطلب');
  insert into public.notifications (user_id, kind, title, body)
  values (uid, 'order', 'تم استلام طلبك', 'طلبك #' || o.number || ' قيد المراجعة، سنبلغك عند تأكيده.');
  return o;
end $$;

-- ───────── الصلاحيات (RLS) ─────────
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.locations enable row level security;
alter table public.stock_levels enable row level security;
alter table public.stock_movements enable row level security;
alter table public.addresses enable row level security;
alter table public.favorites enable row level security;
alter table public.coupons enable row level security;
alter table public.banners enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.notifications enable row level security;

-- الملف الشخصي: صاحبته أو الفريق
create policy "profiles read own or staff" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profiles update own" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());
create policy "profiles staff manage" on public.profiles for all using (public.is_staff()) with check (public.is_staff());

-- الكتالوج: قراءة عامة لما هو ظاهر، والفريق يدير
create policy "categories public read" on public.categories for select using (is_visible or public.is_staff());
create policy "categories staff write" on public.categories for all using (public.is_staff()) with check (public.is_staff());
create policy "products public read" on public.products for select using (is_online or public.is_staff());
create policy "products staff write" on public.products for all using (public.is_staff()) with check (public.is_staff());
create policy "variants public read" on public.product_variants for select using (true);
create policy "variants staff write" on public.product_variants for all using (public.is_staff()) with check (public.is_staff());
create policy "banners public read" on public.banners for select using (is_active or public.is_staff());
create policy "banners staff write" on public.banners for all using (public.is_staff()) with check (public.is_staff());
create policy "shipping public read" on public.shipping_methods for select using (is_active or public.is_staff());
create policy "shipping staff write" on public.shipping_methods for all using (public.is_staff()) with check (public.is_staff());

-- المخزون: قراءة عامة للكميات (لمعرفة التوفر)، والكتابة للفريق فقط
create policy "locations public read" on public.locations for select using (true);
create policy "locations staff write" on public.locations for all using (public.is_staff()) with check (public.is_staff());
create policy "stock public read" on public.stock_levels for select using (true);
create policy "stock staff write" on public.stock_levels for all using (public.is_staff()) with check (public.is_staff());
create policy "movements staff" on public.stock_movements for all using (public.is_staff()) with check (public.is_staff());

-- بيانات العميلة الخاصة
create policy "addresses own" on public.addresses for all using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "favorites own" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications own read" on public.notifications for select using (user_id = auth.uid() or public.is_staff());
create policy "notifications own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications staff write" on public.notifications for insert with check (public.is_staff());

-- الطلبات: تُنشأ عبر place_order فقط؛ العميلة تقرأ طلباتها والفريق يدير الكل
create policy "orders read own" on public.orders for select using (user_id = auth.uid() or public.is_staff());
create policy "orders staff write" on public.orders for update using (public.is_staff()) with check (public.is_staff());
create policy "order items read" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));
create policy "order events read" on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));
create policy "order events staff write" on public.order_events for insert with check (public.is_staff());

-- الكوبونات: لا تُكشف للعامة؛ التحقق يتم داخل place_order وvalidate_coupon
create policy "coupons staff" on public.coupons for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.validate_coupon(code_in text, subtotal_in numeric)
returns table (code text, kind public.discount_kind, value numeric, discount numeric)
language sql stable security definer set search_path = public as $$
  select c.code, c.kind, c.value,
         case c.kind when 'percent' then round(subtotal_in * c.value / 100, 2)
                     when 'fixed' then least(c.value, subtotal_in) else 0 end
    from public.coupons c
   where upper(c.code) = upper(code_in) and c.is_active and c.channel in ('all', 'online')
     and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at >= now())
     and (c.max_uses is null or c.used_count < c.max_uses) and subtotal_in >= c.min_order;
$$;

revoke execute on function public.place_order from anon;
grant execute on function public.place_order to authenticated;
grant execute on function public.validate_coupon to anon, authenticated;
