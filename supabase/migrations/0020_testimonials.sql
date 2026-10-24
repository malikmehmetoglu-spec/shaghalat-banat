-- آراء الزبونات في الصفحة الرئيسية — قراءة عامة للظاهر منها، والإدارة لفريق العمل
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  body text not null,
  rating smallint not null default 5 check (rating between 1 and 5),
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
create policy "testimonials public read" on public.testimonials for select using (is_visible or public.is_staff());
create policy "testimonials staff manage" on public.testimonials for all using (public.is_staff()) with check (public.is_staff());
