-- المنتج يمكن أن يكون في أكثر من قسم
create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index if not exists product_categories_cat on public.product_categories (category_id);
alter table public.product_categories enable row level security;
create policy "product_categories public read" on public.product_categories for select using (true);
create policy "product_categories staff write" on public.product_categories for all using (public.is_staff()) with check (public.is_staff());

insert into public.product_categories (product_id, category_id)
select id, category_id from public.products where category_id is not null
on conflict do nothing;
