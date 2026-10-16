-- إضافة كمية بشكل ذرّي (لا تُمسح أي حركة بيع تحدث في نفس اللحظة)
create or replace function public.stock_add(variant uuid, loc uuid, delta integer, note text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform public.require_staff();
  if delta is null or delta <= 0 then raise exception 'الكمية يجب أن تكون أكبر من صفر'; end if;
  insert into public.stock_levels (variant_id, location_id, on_hand) values (variant, loc, delta)
    on conflict (variant_id, location_id) do update set on_hand = public.stock_levels.on_hand + excluded.on_hand
    returning on_hand into n;
  insert into public.stock_movements (variant_id, to_location, qty, kind, note, created_by)
  values (variant, loc, delta, 'in', coalesce(note, 'إدخال بضاعة'), auth.uid());
  return n;
end $$;
revoke execute on function public.stock_add(uuid, uuid, integer, text) from public, anon;
grant execute on function public.stock_add(uuid, uuid, integer, text) to authenticated;
