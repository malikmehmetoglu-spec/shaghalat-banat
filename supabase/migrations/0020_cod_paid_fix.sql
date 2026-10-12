-- الدفع عند الاستلام: لا يُعتبر مدفوعاً عند التسليم — يبقى «لنا عند شركة التوصيل» حتى التحصيل
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
         is_paid = case when new_status = 'delivered' and payment_method <> 'cod' then true else is_paid end
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

