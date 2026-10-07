-- شغلات بنات — المرحلة 2: الموردون والمشتريات، ونقطة البيع، وعمليات المخزون والطلبات للإدارة.

-- ───────── الموردون وأوامر الشراء ─────────
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  phone text,
  lead_days integer,
  notes text,
  created_at timestamptz not null default now()
);

create type public.po_status as enum ('draft', 'sent', 'partial', 'received', 'cancelled');
create sequence public.po_number_seq start 101;

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('PO-' || nextval('public.po_number_seq')),
  supplier_id uuid not null references public.suppliers(id),
  location_id uuid not null references public.locations(id),
  status public.po_status not null default 'draft',
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  received_at timestamptz
);

create table public.po_items (
  id bigint generated always as identity primary key,
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  qty integer not null check (qty > 0),
  unit_cost numeric(14,2) not null default 0,
  received_qty integer not null default 0
);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_items enable row level security;
create policy "suppliers staff" on public.suppliers for all using (public.is_staff()) with check (public.is_staff());
create policy "po staff" on public.purchase_orders for all using (public.is_staff()) with check (public.is_staff());
create policy "po items staff" on public.po_items for all using (public.is_staff()) with check (public.is_staff());

alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists cashier_id uuid references public.profiles(id);

-- ───────── مساعد: رفض غير الموظفين ─────────
create or replace function public.require_staff()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'هذه العملية مخصّصة لفريق العمل'; end if;
end $$;

-- ───────── تغيير حالة الطلب ─────────
-- shipped: تُخصم الكمية المحجوزة فعلياً من المخزون. cancelled: يُفك الحجز (أو تُعاد الكمية إن كانت قد شُحنت).
create or replace function public.admin_set_order_status(order_id uuid, new_status public.order_status, note text default null)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  it record;
  was_shipped boolean;
  labels jsonb := '{"confirmed":"تم تأكيد طلبك","preparing":"طلبك قيد التجهيز","shipped":"طلبك في الطريق","delivered":"تم توصيل طلبك","cancelled":"تم إلغاء طلبك","returned":"تم استلام المرتجع"}';
begin
  perform public.require_staff();
  select * into o from public.orders where id = order_id for update;
  if o.id is null then raise exception 'الطلب غير موجود'; end if;
  if o.status = new_status then return o; end if;
  if o.status in ('cancelled', 'returned') then raise exception 'لا يمكن تعديل طلب ملغى أو مُرتجع'; end if;
  was_shipped := o.status in ('shipped', 'delivered');

  if o.channel = 'online' then
    for it in select variant_id, location_id, qty from public.order_items where order_items.order_id = o.id loop
      if new_status in ('shipped', 'delivered') and not was_shipped then
        update public.stock_levels set on_hand = on_hand - it.qty, reserved = greatest(reserved - it.qty, 0)
         where variant_id = it.variant_id and location_id = it.location_id;
        insert into public.stock_movements (variant_id, from_location, qty, kind, reference, created_by)
        values (it.variant_id, it.location_id, -it.qty, 'out', o.number, auth.uid());
      elsif new_status = 'cancelled' and not was_shipped then
        update public.stock_levels set reserved = greatest(reserved - it.qty, 0)
         where variant_id = it.variant_id and location_id = it.location_id;
        insert into public.stock_movements (variant_id, from_location, qty, kind, reference, created_by)
        values (it.variant_id, it.location_id, it.qty, 'release', o.number, auth.uid());
      elsif new_status in ('cancelled', 'returned') and was_shipped then
        update public.stock_levels set on_hand = on_hand + it.qty
         where variant_id = it.variant_id and location_id = it.location_id;
        insert into public.stock_movements (variant_id, to_location, qty, kind, reference, created_by)
        values (it.variant_id, it.location_id, it.qty, 'return', o.number, auth.uid());
      end if;
    end loop;
  end if;

  update public.orders
     set status = new_status,
         is_paid = case when new_status = 'delivered' then true else is_paid end
   where id = o.id returning * into o;

  if new_status = 'delivered' then
    update public.products p set sold_count = sold_count + x.q
      from (select pv.product_id, sum(oi.qty) q from public.order_items oi join public.product_variants pv on pv.id = oi.variant_id
             where oi.order_id = o.id group by pv.product_id) x
     where p.id = x.product_id;
  end if;

  insert into public.order_events (order_id, status, note) values (o.id, new_status, note);
  if o.user_id is not null and labels ? new_status::text then
    insert into public.notifications (user_id, kind, title, body)
    values (o.user_id, 'order', labels->>new_status::text, 'الطلب #' || o.number || coalesce(' — ' || note, ''));
  end if;
  return o;
end $$;

-- ───────── تحويل بين المواقع ─────────
create or replace function public.stock_transfer(variant uuid, from_loc uuid, to_loc uuid, qty integer, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare avail integer;
begin
  perform public.require_staff();
  if qty <= 0 then raise exception 'الكمية يجب أن تكون أكبر من صفر'; end if;
  if from_loc = to_loc then raise exception 'اختاري موقعين مختلفين'; end if;
  select on_hand - reserved into avail from public.stock_levels where variant_id = variant and location_id = from_loc for update;
  if coalesce(avail, 0) < qty then raise exception 'الكمية المتاحة في المصدر غير كافية'; end if;
  update public.stock_levels set on_hand = on_hand - qty where variant_id = variant and location_id = from_loc;
  insert into public.stock_levels (variant_id, location_id, on_hand) values (variant, to_loc, qty)
    on conflict (variant_id, location_id) do update set on_hand = stock_levels.on_hand + excluded.on_hand;
  insert into public.stock_movements (variant_id, from_location, to_location, qty, kind, note, created_by)
  values (variant, from_loc, to_loc, qty, 'transfer', note, auth.uid());
end $$;

-- ───────── إدخال بضاعة / تسوية جرد ─────────
create or replace function public.stock_set(variant uuid, loc uuid, new_qty integer, reason text default 'adjust', note text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare old_qty integer; diff integer;
begin
  perform public.require_staff();
  if new_qty < 0 then raise exception 'الكمية لا يمكن أن تكون سالبة'; end if;
  select on_hand into old_qty from public.stock_levels where variant_id = variant and location_id = loc for update;
  old_qty := coalesce(old_qty, 0);
  diff := new_qty - old_qty;
  if diff = 0 then return 0; end if;
  insert into public.stock_levels (variant_id, location_id, on_hand) values (variant, loc, new_qty)
    on conflict (variant_id, location_id) do update set on_hand = excluded.on_hand;
  insert into public.stock_movements (variant_id, from_location, to_location, qty, kind, note, created_by)
  values (variant, case when diff < 0 then loc end, case when diff > 0 then loc end, diff,
          case when reason = 'in' then 'in'::public.movement_kind else 'adjust'::public.movement_kind end, note, auth.uid());
  return diff;
end $$;

-- ───────── استلام أمر شراء ─────────
create or replace function public.receive_purchase_order(po uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.purchase_orders; it record;
begin
  perform public.require_staff();
  select * into p from public.purchase_orders where id = po for update;
  if p.id is null then raise exception 'أمر الشراء غير موجود'; end if;
  if p.status in ('received', 'cancelled') then raise exception 'أمر الشراء مُستلم أو ملغى'; end if;
  for it in select * from public.po_items where po_id = po loop
    insert into public.stock_levels (variant_id, location_id, on_hand) values (it.variant_id, p.location_id, it.qty - it.received_qty)
      on conflict (variant_id, location_id) do update set on_hand = stock_levels.on_hand + excluded.on_hand;
    insert into public.stock_movements (variant_id, to_location, qty, kind, reference, created_by)
    values (it.variant_id, p.location_id, it.qty - it.received_qty, 'in', p.number, auth.uid());
    update public.po_items set received_qty = qty where id = it.id;
  end loop;
  update public.purchase_orders set status = 'received', received_at = now() where id = po;
end $$;

-- ───────── بيع نقطة البيع في المحل ─────────
-- items: [{"variant_id": "...", "qty": 1}]  — تُخصم الكمية من مخزون المحل مباشرة.
create or replace function public.pos_sale(items jsonb, payment public.payment_method default 'cash', discount_amount numeric default 0, customer_phone_in text default null)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  o public.orders; it jsonb; v record; store uuid; sub numeric := 0; have integer;
begin
  perform public.require_staff();
  if jsonb_array_length(items) = 0 then raise exception 'الفاتورة فارغة'; end if;
  select id into store from public.locations where kind = 'store' order by created_at limit 1;
  if store is null then raise exception 'لا يوجد موقع محل معرّف'; end if;

  insert into public.orders (channel, status, payment_method, is_paid, customer_phone, cashier_id, user_id)
  values ('store', 'delivered', payment, true, nullif(customer_phone_in, ''), auth.uid(),
          (select pr.id from public.profiles pr where pr.phone is not null and pr.phone = nullif(customer_phone_in, '') limit 1))
  returning * into o;

  for it in select * from jsonb_array_elements(items) loop
    select pv.id, p.name, p.id as product_id, coalesce(pv.price_override, p.price) as price,
           concat_ws(' · ', nullif(pv.size, ''), nullif(pv.color_name, '')) as label
      into v from public.product_variants pv join public.products p on p.id = pv.product_id
     where pv.id = (it->>'variant_id')::uuid;
    if v.id is null then raise exception 'منتج غير معروف'; end if;
    select on_hand - reserved into have from public.stock_levels where variant_id = v.id and location_id = store for update;
    if coalesce(have, 0) < (it->>'qty')::int then raise exception 'الكمية في المحل غير كافية من "%"', v.name; end if;
    update public.stock_levels set on_hand = on_hand - (it->>'qty')::int where variant_id = v.id and location_id = store;
    insert into public.stock_movements (variant_id, from_location, qty, kind, reference, created_by)
    values (v.id, store, -(it->>'qty')::int, 'out', o.number, auth.uid());
    insert into public.order_items (order_id, variant_id, product_name, variant_label, unit_price, qty, location_id)
    values (o.id, v.id, v.name, v.label, v.price, (it->>'qty')::int, store);
    update public.products set sold_count = sold_count + (it->>'qty')::int where id = v.product_id;
    sub := sub + v.price * (it->>'qty')::int;
  end loop;

  update public.orders set subtotal = sub, discount = least(greatest(discount_amount, 0), sub),
         total = sub - least(greatest(discount_amount, 0), sub)
   where id = o.id returning * into o;
  insert into public.order_events (order_id, status, note) values (o.id, 'delivered', 'بيع مباشر في المحل');
  return o;
end $$;

-- ───────── صلاحيات الدوال ─────────
revoke execute on function public.admin_set_order_status(uuid, public.order_status, text) from public, anon;
revoke execute on function public.stock_transfer(uuid, uuid, uuid, integer, text) from public, anon;
revoke execute on function public.stock_set(uuid, uuid, integer, text, text) from public, anon;
revoke execute on function public.receive_purchase_order(uuid) from public, anon;
revoke execute on function public.pos_sale(jsonb, public.payment_method, numeric, text) from public, anon;
revoke execute on function public.require_staff() from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.stock_transfer(uuid, uuid, uuid, integer, text) to authenticated;
grant execute on function public.stock_set(uuid, uuid, integer, text, text) to authenticated;
grant execute on function public.receive_purchase_order(uuid) to authenticated;
grant execute on function public.pos_sale(jsonb, public.payment_method, numeric, text) to authenticated;
grant execute on function public.require_staff() to authenticated;

-- بيانات تجريبية للموردين
insert into public.suppliers (name, category, phone, lead_days) values
  ('مورد الأقمشة الملكية', 'عبايات', null, 7),
  ('دار الدانتيل', 'لانجري', null, 10),
  ('عطور الشام', 'عطور', null, 5),
  ('مصنع القطن الناعم', 'بيجامات', null, 14);
