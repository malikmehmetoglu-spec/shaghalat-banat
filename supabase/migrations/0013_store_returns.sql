-- مرتجعات المحل: قطعة أعادتها زبونة أو تراجعت عن الشراء ← تعود للمخزون فوراً ويُسجَّل المبلغ المُعاد
create sequence if not exists public.store_return_seq start 1001;
create table if not exists public.store_returns (
  id uuid primary key default gen_random_uuid(),
  number text not null default ('R-' || nextval('public.store_return_seq')),
  kind text not null check (kind in ('return', 'cancel')),
  variant_id uuid not null references public.product_variants(id),
  location_id uuid not null references public.locations(id),
  qty integer not null check (qty > 0),
  refund numeric(14,2) not null default 0 check (refund >= 0),
  refund_from text not null default '1110' check (refund_from in ('1110', '1120', 'none')),
  reason text,
  customer_phone text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists store_returns_created on public.store_returns (created_at desc);
alter table public.store_returns enable row level security;
create policy "store returns staff read" on public.store_returns for select using (public.is_staff());

create or replace function public.record_store_return(p_items jsonb, p_kind text, p_refund numeric, p_refund_from text, p_reason text, p_phone text default null)
returns text language plpgsql security definer set search_path = public as $$
declare it jsonb; loc uuid; v uuid; q integer; total_qty integer := 0; share numeric; cost numeric; first_no text; this_no text; rid uuid; r_from text;
begin
  perform public.require_staff();
  if p_kind not in ('return', 'cancel') then raise exception 'نوع غير صالح'; end if;
  r_from := coalesce(nullif(p_refund_from, ''), '1110');
  if coalesce(p_refund, 0) <= 0 then r_from := 'none'; end if;
  select id into loc from public.locations where kind = 'store' order by created_at limit 1;
  if loc is null then raise exception 'لا يوجد موقع للمحل'; end if;
  select coalesce(sum((x->>'qty')::int), 0) into total_qty from jsonb_array_elements(p_items) x;
  if total_qty <= 0 then raise exception 'اختاري منتجاً واحداً على الأقل'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v := (it->>'variant')::uuid; q := (it->>'qty')::int;
    if q is null or q <= 0 then continue; end if;
    share := case when r_from = 'none' then 0 else round(coalesce(p_refund, 0) * q / total_qty, 2) end;
    insert into public.store_returns (kind, variant_id, location_id, qty, refund, refund_from, reason, customer_phone)
      values (p_kind, v, loc, q, share, r_from, nullif(p_reason, ''), nullif(p_phone, '')) returning id, number into rid, this_no;
    first_no := coalesce(first_no, this_no);
    -- إعادة القطعة للمخزون (تُضاف للموجود)
    insert into public.stock_levels (variant_id, location_id, on_hand) values (v, loc, q)
      on conflict (variant_id, location_id) do update set on_hand = public.stock_levels.on_hand + excluded.on_hand;
    insert into public.stock_movements (variant_id, to_location, qty, kind, reference, note, created_by)
      values (v, loc, q, 'return', this_no, case when p_kind = 'cancel' then 'تراجع عن الشراء' else 'مرتجع في المحل' end || coalesce(' — ' || nullif(p_reason, ''), ''), auth.uid());
    -- القيود تلقائياً (لا تظهر للمستخدم): عكس الإيراد والمبلغ المُعاد + إعادة تكلفة البضاعة للمخزون
    select coalesce(p.cost, 0) * q into cost from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = v;
    perform public._post_entry(current_date, 'مرتجع في المحل ' || this_no, 'store_return', rid::text, jsonb_build_array(
      jsonb_build_object('account', '4200', 'debit', share),
      jsonb_build_object('account', case when r_from = 'none' then '1110' else r_from end, 'credit', share),
      jsonb_build_object('account', '1200', 'debit', cost),
      jsonb_build_object('account', '5100', 'credit', cost)));
  end loop;
  return first_no;
end $$;

-- الوردية: المبالغ المُعادة نقداً تُخصم من المتوقع في الصندوق
create or replace function public.shift_summary()
returns table (shift_id uuid, opened_at timestamptz, opened_by_name text, opening numeric, cash_sales numeric, cash_expenses numeric, expected numeric)
language sql stable security definer set search_path = public as $$
  with s as (select * from public.cash_shifts where closed_at is null),
  t as (
    select s.id,
      coalesce((select sum(total) from public.orders o where o.channel = 'store' and o.payment_method = 'cash' and o.status = 'delivered' and o.created_at >= s.opened_at), 0)
      - coalesce((select sum(refund) from public.store_returns r where r.refund_from = '1110' and r.created_at >= s.opened_at), 0) as sales,
      coalesce((select sum(amount) from public.expenses e where e.paid_from = '1110' and e.created_at >= s.opened_at), 0) as exp
    from s)
  select s.id, s.opened_at, pr.full_name, s.opening, t.sales, t.exp, s.opening + t.sales - t.exp
  from s join t on t.id = s.id left join public.profiles pr on pr.id = s.opened_by
  where public.is_staff();
$$;
