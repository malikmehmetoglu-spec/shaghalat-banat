-- المرحلة 2: فقط المديرة تستطيع تغيير أدوار المستخدمين
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null  -- محرر SQL ومفتاح الخدمة مسموح لهما
     and coalesce(public.my_role()::text, '') <> 'owner' then
    raise exception 'تغيير الأدوار متاح للمديرة فقط';
  end if;
  return new;
end $$;
revoke execute on function public.guard_role_change() from public, anon, authenticated;
drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update of role on public.profiles
  for each row execute function public.guard_role_change();
