-- روابط التواصل العامة (صفحة /qr وغيرها) — قراءة عامة، تعديل لفريق العمل
create table if not exists public.store_profile (
  id integer primary key default 1 check (id = 1),
  whatsapp text,
  facebook_url text,
  instagram_url text,
  tagline text default 'كل ما تحبّه البنات في مكان واحد',
  updated_at timestamptz not null default now()
);
insert into public.store_profile (id) values (1) on conflict (id) do nothing;
alter table public.store_profile enable row level security;
create policy "store profile public read" on public.store_profile for select using (true);
create policy "store profile staff update" on public.store_profile for update using (public.is_staff()) with check (public.is_staff());
