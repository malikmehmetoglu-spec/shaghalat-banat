-- من ضيفة إلى حساب: رابط تتبّع لكل طلب، ربط الطلبات القديمة بالرقم المُتحقَّق منه، وهدية التسجيل
create extension if not exists pgcrypto;

alter table public.orders add column if not exists track_token text not null default encode(extensions.gen_random_bytes(12), 'hex');
create unique index if not exists orders_track_token_key on public.orders (track_token);

alter table public.profiles add column if not exists welcome_coupon text;
alter table public.store_profile add column if not exists welcome_percent int not null default 10 check (welcome_percent between 0 and 50);

-- طلب الضيفة يُرجع رمز التتبّع
do $$ declare d text; begin
  select pg_get_functiondef('public.place_order_guest(jsonb,text,text,text,text,text,payment_method,text,text)'::regprocedure) into d;
  d := replace(d, $q$jsonb_build_object('id', o.id, 'number', o.number, 'total', o.total)$q$, $q$jsonb_build_object('id', o.id, 'number', o.number, 'total', o.total, 'token', o.track_token)$q$);
  execute d;
end $$;

-- صفحة التتبّع العامة: لا تكشف الهاتف ولا الشارع
create or replace function public.track_order(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.number, 'status', o.status, 'total', o.total, 'subtotal', o.subtotal, 'shipping', o.shipping,
    'discount', o.discount, 'payment', o.payment_method, 'created_at', o.created_at, 'city', o.address_snapshot->>'city',
    'name', split_part(coalesce(o.address_snapshot->>'name', ''), ' ', 1), 'has_account', o.user_id is not null,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.product_name, 'label', i.variant_label, 'qty', i.qty, 'price', i.unit_price)) from public.order_items i where i.order_id = o.id), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('status', e.status, 'at', e.created_at) order by e.created_at) from public.order_events e where e.order_id = o.id), '[]'))
  from public.orders o where o.track_token = p_token and length(p_token) >= 20;
$$;
grant execute on function public.track_order(text) to anon, authenticated;

-- بعد الدخول برمز التحقق: ضمّ طلبات الضيفة بنفس الرقم + هدية التسجيل مرة واحدة
create or replace function public.claim_my_orders()
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); ph text; n int := 0; pct int; code text; prof public.profiles; nm text;
begin
  if uid is null then return jsonb_build_object('claimed', 0); end if;
  select private.norm_phone(u.phone) into ph from auth.users u where u.id = uid and u.phone_confirmed_at is not null;
  select * into prof from public.profiles where id = uid;
  if ph is null or prof.role <> 'customer' then return jsonb_build_object('claimed', 0); end if;

  update public.orders set user_id = uid where user_id is null and customer_phone = ph;
  get diagnostics n = row_count;

  if coalesce(prof.full_name, '') = '' then
    select o.address_snapshot->>'name' into nm from public.orders o where o.user_id = uid and o.address_snapshot ? 'name' order by o.created_at desc limit 1;
    if nm is not null then update public.profiles set full_name = nm where id = uid; end if;
  end if;

  if prof.welcome_coupon is null then
    select welcome_percent into pct from public.store_profile where id = 1;
    if coalesce(pct, 0) > 0 then
      code := 'SB' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));
      insert into public.coupons (code, description, kind, value, max_uses, ends_at, channel)
      values (code, 'هدية التسجيل', 'percent', pct, 1, now() + interval '30 days', 'online');
      update public.profiles set welcome_coupon = code where id = uid;
      insert into public.notifications (user_id, kind, title, body)
      values (uid, 'offer', 'هديتك: خصم ' || pct || '% 🎁', 'استخدمي الكود ' || code || ' على طلبك القادم خلال 30 يوماً.');
    end if;
  end if;
  return jsonb_build_object('claimed', n, 'coupon', coalesce(prof.welcome_coupon, code), 'percent', pct);
end $$;
grant execute on function public.claim_my_orders() to authenticated;
