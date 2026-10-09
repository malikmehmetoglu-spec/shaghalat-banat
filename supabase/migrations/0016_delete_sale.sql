-- حذف عملية بيع (للمدير فقط): تعود البضائع للمخزون وتُحذف قيود البيع من المالية كأنها لم تكن
create or replace function public.delete_sale(p_order uuid)
returns text language plpgsql security definer set search_path = public as $$
declare o public.orders; it record; deducted boolean;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') then
    raise exception 'حذف عمليات البيع متاح للمدير فقط';
  end if;
  select * into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'العملية غير موجودة'; end if;

  -- هل خرجت البضاعة فعلاً من المخزون؟
  deducted := o.channel = 'store' or o.status in ('shipped', 'delivered');

  for it in select variant_id, location_id, qty from public.order_items where order_id = o.id loop
    if o.status in ('cancelled', 'returned') then
      null;  -- أُعيدت للمخزون سابقاً
    elsif deducted then
      update public.stock_levels set on_hand = on_hand + it.qty where variant_id = it.variant_id and location_id = it.location_id;
    else
      update public.stock_levels set reserved = greatest(reserved - it.qty, 0) where variant_id = it.variant_id and location_id = it.location_id;
    end if;
  end loop;

  if o.status = 'delivered' then
    update public.products p set sold_count = greatest(sold_count - x.q, 0)
      from (select pv.product_id, sum(oi.qty) q from public.order_items oi join public.product_variants pv on pv.id = oi.variant_id
             where oi.order_id = o.id group by pv.product_id) x
     where p.id = x.product_id;
  end if;

  -- حذف القيود المالية للبيع ومرتجعه، وحركات المخزون المرتبطة
  delete from public.journal_entries where source in ('sale', 'sale_return') and source_id = o.id::text;
  delete from public.stock_movements where reference = o.number;
  delete from public.orders where id = o.id;   -- تُحذف البنود والأحداث تلقائياً
  return o.number;
end $$;
