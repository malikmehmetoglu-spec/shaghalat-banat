-- حسابات الإدارة: بريد/اسم مستخدم + كلمة مرور، تُنشئها المديرة (owner) من لوحة الإدارة.
-- العميلات يبقين على رقم الهاتف + رمز واتساب.

-- مخطط داخلي غير مكشوف لواجهة الـ API: دوال لا يجوز استدعاؤها من المتصفح
create schema if not exists private;

-- إنشاء مستخدم دخول بكلمة مرور (داخلي)
create or replace function private._create_password_user(p_email text, p_password text, p_name text, p_role public.app_role)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as $$
declare uid uuid := gen_random_uuid(); em text := lower(trim(p_email));
begin
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'اسم المستخدم أو البريد غير صالح'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'; end if;
  if exists (select 1 from auth.users where email = em) then raise exception 'هذا الحساب موجود بالفعل'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_name), now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  update public.profiles set role = p_role, full_name = coalesce(nullif(p_name, ''), full_name) where id = uid;
  return uid;
end $$;

-- المديرة تُنشئ حساب موظفة
create or replace function public.admin_create_staff(p_login text, p_password text, p_name text, p_role public.app_role)
returns uuid language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(p_login));
begin
  if public.my_role() is distinct from 'owner' then raise exception 'إنشاء الحسابات متاح للمديرة فقط'; end if;
  if p_role = 'customer' then raise exception 'اختاري دوراً للموظفة'; end if;
  if em !~ '@' then em := em || '@shaghalat-banat.com'; end if;  -- اسم مستخدم بدون بريد
  return private._create_password_user(em, p_password, p_name, p_role);
end $$;

-- تغيير كلمة مرور موظفة (المديرة) أو كلمة مروري أنا
create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if p_user <> auth.uid() and public.my_role() is distinct from 'owner' then raise exception 'متاح للمديرة فقط'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
end $$;

-- إيقاف / تفعيل حساب موظفة
create or replace function public.admin_set_staff_active(p_user uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if public.my_role() is distinct from 'owner' then raise exception 'متاح للمديرة فقط'; end if;
  if p_user = auth.uid() then raise exception 'لا يمكنك إيقاف حسابك'; end if;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end where id = p_user;
end $$;

-- حالة الحسابات (للعرض في صفحة الموظفين)
create or replace function public.staff_accounts()
returns table (id uuid, login text, full_name text, role public.app_role, active boolean, last_sign_in_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select p.id, u.email, p.full_name, p.role, (u.banned_until is null or u.banned_until < now()), u.last_sign_in_at, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.role <> 'customer' and public.is_staff()
  order by p.created_at;
$$;

grant execute on function public.admin_create_staff(text, text, text, public.app_role), public.admin_set_password(uuid, text),
  public.admin_set_staff_active(uuid, boolean), public.staff_accounts() to authenticated;
