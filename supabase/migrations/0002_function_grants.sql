-- تشديد صلاحيات الدوال: لا يستدعي أحد دالة التسجيل مباشرة، وإتمام الطلب للمسجّلات فقط.
-- is_staff و my_role تبقى متاحة لأن سياسات RLS تستدعيها، وهي لا تكشف إلا دور المستخدم الحالي.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.place_order(jsonb, uuid, text, public.payment_method, text, text) from public, anon;
grant execute on function public.place_order(jsonb, uuid, text, public.payment_method, text, text) to authenticated;
