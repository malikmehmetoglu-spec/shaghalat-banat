-- حذف مستودع (أرشفة): للمدير فقط، وبشرط أن يكون فارغاً
alter table public.locations add column if not exists archived_at timestamptz;

create or replace function public.archive_location(p_loc uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.locations; units integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') then
    raise exception 'حذف المستودع متاح للمدير فقط';
  end if;
  select * into l from public.locations where id = p_loc and archived_at is null;
  if l.id is null then raise exception 'المستودع غير موجود'; end if;
  if l.kind = 'store' then raise exception 'لا يمكن حذف المحل — يمكن حذف المستودعات فقط'; end if;
  select coalesce(sum(on_hand), 0) into units from public.stock_levels where location_id = p_loc;
  if units > 0 then raise exception 'في هذا المستودع % قطعة — انقليها إلى موقع آخر أولاً ثم احذفيه', units; end if;
  update public.locations set archived_at = now(), sells_online = false where id = p_loc;
end $$;
