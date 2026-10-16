-- عدد المنتجات الظاهرة فعلاً في كل قسم (يستثني المؤرشف وغير الظاهر في المتجر)
create or replace view public.category_product_counts as
select pc.category_id, count(*)::int as n
from public.product_categories pc join public.products p on p.id = pc.product_id
where p.archived_at is null and p.is_online
group by pc.category_id;
grant select on public.category_product_counts to anon, authenticated;
