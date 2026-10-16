-- منع إرجاع كمية أكبر مما بيع فعلاً
create or replace function public.record_store_return(p_items jsonb, p_kind text, p_refund numeric, p_refund_from text, p_reason text, p_phone text default null)
returns text language plpgsql security definer set search_path = public as $$
declare sold integer; back integer; pname text; it jsonb; loc uuid; v uuid; q integer; total_qty integer := 0; share numeric; cost numeric; first_no text; this_no text; rid uuid; r_from text;
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
    -- لا يمكن إرجاع أكثر مما بيع فعلاً من هذه القطعة
    select coalesce(sum(oi.qty), 0) into sold from public.order_items oi join public.orders o on o.id = oi.order_id
     where oi.variant_id = v and o.status = 'delivered';
    select coalesce(sum(r.qty), 0) into back from public.store_returns r where r.variant_id = v;
    if back + q > sold then
      select p.name || coalesce(' · ' || nullif(concat_ws(' ', pv.color_name, pv.size), ''), '') into pname
        from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = v;
      raise exception 'لا يمكن إرجاع % من «%» — المباع منها % والمُرتجع سابقاً %', q, pname, sold, back;
    end if;
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
