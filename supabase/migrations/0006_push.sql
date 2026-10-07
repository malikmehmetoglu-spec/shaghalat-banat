-- المرحلة 4: الإشعارات (Web Push للمتصفح/PWA + FCM لتطبيقات Android/iOS)

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('web', 'fcm')),
  endpoint text not null unique,     -- web: رابط الاشتراك · fcm: رمز الجهاز
  keys jsonb,                        -- web: p256dh + auth
  lang text not null default 'ar',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

create table public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  link text not null default '/',
  audience text not null default 'all' check (audience in ('all', 'buyers', 'no_orders', 'staff', 'test')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.push_campaigns enable row level security;
create policy "push subs own or staff read" on public.push_subscriptions for select using (user_id = auth.uid() or public.is_staff());
create policy "push subs own delete" on public.push_subscriptions for delete using (user_id = auth.uid() or public.is_staff());
create policy "push campaigns staff" on public.push_campaigns for all using (public.is_staff()) with check (public.is_staff());

-- تسجيل/تحديث اشتراك جهاز (متاح للضيفة أيضاً)
create or replace function public.register_push(p_kind text, p_endpoint text, p_keys jsonb default null, p_lang text default 'ar')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('web', 'fcm') or coalesce(p_endpoint, '') = '' then raise exception 'اشتراك غير صالح'; end if;
  insert into public.push_subscriptions (user_id, kind, endpoint, keys, lang)
  values (auth.uid(), p_kind, p_endpoint, p_keys, coalesce(nullif(p_lang, ''), 'ar'))
  on conflict (endpoint) do update set user_id = coalesce(auth.uid(), push_subscriptions.user_id), keys = excluded.keys, lang = excluded.lang, last_seen = now();
end $$;

create or replace function public.unregister_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke execute on function public.register_push(text, text, jsonb, text) from public;
revoke execute on function public.unregister_push(text) from public;
grant execute on function public.register_push(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.unregister_push(text) to anon, authenticated;
