-- طلب من المتجر بدون تسجيل دخول (الاسم + الهاتف + العنوان) — ريثما يُفعَّل الدخول برمز واتساب
create or replace function public.place_order_guest(
  items jsonb, cust_name text, cust_phone text, city text, street text,
  shipping_code text, payment public.payment_method default 'cod', coupon text default null, note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); o public.orders; it jsonb; v record; loc uuid;
  sub numeric := 0; ship numeric := 0; disc numeric := 0; c public.coupons; addr jsonb;
  free_ship_threshold constant numeric := 300; ph text;
begin
  if jsonb_array_length(coalesce(items, '[]')) = 0 then raise exception 'السلة فارغة'; end if;
  if coalesce(trim(cust_name), '') = '' then raise exception 'الاسم مطلوب'; end if;
  ph := private.norm_phone(cust_phone);
  if ph is null or length(ph) < 11 then raise exception 'رقم الهاتف غير صحيح'; end if;
  if coalesce(trim(city), '') = '' or coalesce(trim(street), '') = '' then raise exception 'العنوان مطلوب'; end if;

  addr := jsonb_build_object('label', 'عنوان التوصيل', 'name', trim(cust_name), 'phone', ph, 'recipient_phone', '+' || ph, 'city', trim(city), 'street', trim(street));
  select price into ship from public.shipping_methods where code = shipping_code and is_active;
  if ship is null then raise exception 'طريقة الشحن غير متاحة'; end if;

  insert into public.orders (user_id, payment_method, address_snapshot, shipping_code, note, customer_phone)
  values (uid, payment, addr, shipping_code, note, ph) returning * into o;

  for it in select * from jsonb_array_elements(items) loop
    select pv.id, p.name, coalesce(pv.price_override, p.price) as price,
           concat_ws(' · ', nullif(pv.size, ''), nullif(pv.color_name, '')) as label
      into v from public.product_variants pv join public.products p on p.id = pv.product_id
     where pv.id = (it->>'variant_id')::uuid and p.is_online and p.archived_at is null;
    if v.id is null then raise exception 'منتج غير متاح'; end if;
    loc := null;
    select s.location_id into loc
      from public.stock_levels s join public.locations l on l.id = s.location_id
     where s.variant_id = v.id and l.sells_online and l.archived_at is null and s.on_hand - s.reserved >= (it->>'qty')::int
     order by (l.kind = 'warehouse') desc limit 1 for update of s;
    if loc is null then raise exception 'الكمية المطلوبة من "%" غير متوفرة حالياً', v.name; end if;
    update public.stock_levels set reserved = reserved + (it->>'qty')::int where variant_id = v.id and location_id = loc;
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

  update public.orders set subtotal = sub, shipping = ship, discount = disc, total = sub + ship - disc, coupon_code = c.code
   where id = o.id returning * into o;
  insert into public.order_events (order_id, status, note) values (o.id, 'new', 'تم استلام الطلب');
  if uid is not null then
    insert into public.notifications (user_id, kind, title, body)
    values (uid, 'order', 'تم استلام طلبك', 'طلبك #' || o.number || ' قيد المراجعة، سنبلغك عند تأكيده.');
  end if;
  return jsonb_build_object('id', o.id, 'number', o.number, 'total', o.total);
end $$;
grant execute on function public.place_order_guest(jsonb, text, text, text, text, text, public.payment_method, text, text) to anon, authenticated;
