-- فصل الجهاز عن الحساب عند تسجيل الخروج، حتى لا تصل إشعارات حساب لحساب آخر على نفس الجهاز
create or replace function public.unlink_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  update public.push_subscriptions set user_id = null where endpoint = p_endpoint and user_id = auth.uid();
$$;
grant execute on function public.unlink_push(text) to authenticated;

-- الحذف: صاحبة الاشتراك فقط (أو اشتراك ضيفة غير مرتبط بحساب)
create or replace function public.unregister_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and (user_id is null or user_id = auth.uid());
$$;

-- عند الربط: الجهاز يتبع الحساب المسجّل حالياً فقط، وجهاز الضيفة يُفصل عن أي حساب سابق
create or replace function public.register_push(p_kind text, p_endpoint text, p_keys jsonb default null, p_lang text default 'ar')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('web', 'fcm') or coalesce(p_endpoint, '') = '' then raise exception 'اشتراك غير صالح'; end if;
  insert into public.push_subscriptions (user_id, kind, endpoint, keys, lang)
  values (auth.uid(), p_kind, p_endpoint, p_keys, coalesce(nullif(p_lang, ''), 'ar'))
  on conflict (endpoint) do update set user_id = auth.uid(), keys = coalesce(excluded.keys, push_subscriptions.keys), lang = excluded.lang, last_seen = now();
end $$;
