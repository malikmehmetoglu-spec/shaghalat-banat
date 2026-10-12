-- إصلاح أمني: منع غير المسجّلين من تغيير كلمات المرور (auth.uid() = null كان يتجاوز الشرط)
create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path to 'public', 'extensions', 'auth' as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if p_user is distinct from auth.uid() and public.my_role() is distinct from 'owner' then raise exception 'متاح للمديرة فقط'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
end $$;

alter function private.norm_phone(text) set search_path = public;
