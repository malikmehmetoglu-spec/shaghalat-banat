-- حساب المديرة يأخذ دور owner تلقائياً عند أول تسجيل دخول (بدون أي خطوة يدوية)
create or replace function public.bootstrap_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email, '')) = 'malek.hmedann@gmail.com' then new.role := 'owner'; end if;
  return new;
end $$;
create trigger profiles_bootstrap_owner before insert on public.profiles
  for each row execute function public.bootstrap_owner();
update public.profiles set role = 'owner' where lower(email) = 'malek.hmedann@gmail.com';
