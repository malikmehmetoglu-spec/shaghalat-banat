-- التراجع عن فاتورة مبيعات: تبقى الفاتورة في السجل بحالة «مسترجعة/ملغاة»، وتعود القطع للمخزون
-- • بضاعة خرجت فعلاً (بيع المحل، أو طلب شُحن/سُلّم): تعود الكمية للموقع نفسه، والحالة «مُرتجع»
--   فيُنشئ مُشغّل المحاسبة قيداً عكسياً للبيع تلقائياً (المبلغ مُعاد من الصندوق/البنك)
-- • طلب أونلاين لم يُشحن بعد: يُفك حجز الكمية، والحالة «ملغى»
create or replace function public.reverse_invoice(p_order uuid, p_reason text default null)
returns text language plpgsql security definer set search_path = public as $$
declare o public.orders; it record; deducted boolean;
begin
  perform public.require_finance();
  select * into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  if o.status in ('cancelled', 'returned') then raise exception 'تم التراجع عن هذه الفاتورة سابقاً'; end if;
  deducted := o.channel = 'store' or o.status in ('shipped', 'delivered');

  for it in select variant_id, location_id, qty from public.order_items where order_id = o.id loop
    if it.location_id is null then continue; end if;
    if deducted then
      update public.stock_levels set on_hand = on_hand + it.qty where variant_id = it.variant_id and location_id = it.location_id;
      insert into public.stock_movements (variant_id, to_location, qty, kind, reference, created_by)
      values (it.variant_id, it.location_id, it.qty, 'return', o.number, auth.uid());
    else
      update public.stock_levels set reserved = greatest(reserved - it.qty, 0) where variant_id = it.variant_id and location_id = it.location_id;
      insert into public.stock_movements (variant_id, from_location, qty, kind, reference, created_by)
      values (it.variant_id, it.location_id, it.qty, 'release', o.number, auth.uid());
    end if;
  end loop;

  if o.status = 'delivered' then
    update public.products p set sold_count = greatest(sold_count - x.q, 0)
      from (select pv.product_id, sum(oi.qty) q from public.order_items oi join public.product_variants pv on pv.id = oi.variant_id
             where oi.order_id = o.id group by pv.product_id) x
     where p.id = x.product_id;
  end if;

  update public.orders set status = case when deducted then 'returned'::public.order_status else 'cancelled'::public.order_status end where id = o.id;
  insert into public.order_events (order_id, status, note)
  values (o.id, case when deducted then 'returned'::public.order_status else 'cancelled'::public.order_status end, coalesce('تراجع عن الفاتورة: ' || nullif(trim(p_reason), ''), 'تراجع عن الفاتورة'));
  return o.number;
end $$;
revoke execute on function public.reverse_invoice(uuid, text) from public, anon;
grant execute on function public.reverse_invoice(uuid, text) to authenticated;
