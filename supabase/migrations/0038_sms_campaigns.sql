-- سجل الرسائل الجماعية SMS
create table if not exists public.sms_campaigns (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  filters text,
  recipients int not null default 0,
  sent int not null default 0,
  failed int not null default 0,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.sms_campaigns enable row level security;
create policy "sms campaigns marketing" on public.sms_campaigns for all
  using (public.is_staff() and (public.has_access('marketing') or public.my_role()::text = 'marketing'))
  with check (public.is_staff() and (public.has_access('marketing') or public.my_role()::text = 'marketing'));
