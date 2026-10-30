-- أدوار جديدة + صلاحيات إضافية اختيارية يمنحها المدير العام لكل موظفة
alter table public.profiles add column if not exists extra_access text[] not null default '{}';

-- الكاشير القديمة تصبح موظفة مبيعات، والمحاسبة تصبح مديرة متجر مع صلاحية المالية
update public.profiles set role = 'sales' where role = 'cashier';
update public.profiles set role = 'manager', extra_access = array['finance'] where role = 'accountant';

-- لا يغيّر الدور أو الصلاحيات الإضافية إلا المدير العام
create or replace function public._guard_profile_access() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.extra_access is distinct from old.extra_access)
     and coalesce(auth.role(), '') <> 'service_role'
     and coalesce(public.my_role()::text, '') <> 'owner' then
    raise exception 'تغيير الصلاحيات متاح للمدير العام فقط';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_access on public.profiles;
create trigger profiles_guard_access before update on public.profiles for each row execute function public._guard_profile_access();

create or replace function public.has_access(p_key text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (role = 'owner' or p_key = any(extra_access)));
$$;

-- المالية: المدير العام أو من مُنحت صلاحية المالية
create or replace function public.is_finance() returns boolean language sql stable security definer set search_path = public as $$
  select public.has_access('finance');
$$;

drop function if exists public.staff_accounts();
create function public.staff_accounts()
returns table(id uuid, login text, full_name text, role app_role, extra_access text[], active boolean, last_sign_in_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select p.id, u.email, p.full_name, p.role, p.extra_access, (u.banned_until is null or u.banned_until < now()), u.last_sign_in_at, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.role <> 'customer' and public.is_staff()
  order by p.created_at;
$$;

-- سعر الصرف يتبع صلاحية المالية
do $$ declare d text; begin
  select pg_get_functiondef('public.fx_set(numeric,boolean)'::regprocedure) into d;
  d := replace(d, $q$if public.my_role() is distinct from 'owner' and public.my_role() is distinct from 'accountant' then$q$, $q$if not public.is_finance() then$q$);
  execute d;
end $$;
