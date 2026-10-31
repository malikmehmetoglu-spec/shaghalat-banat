-- 31 أكتوبر 2026: تصفير أسعار المنتجات التي لا سعر تكلفة لها (ستُعاد تسعيرها)، مع نسخة احتياطية
create table if not exists private.price_backup_20261031 as
  select id, currency, price, compare_at_price, cost, price_usd, compare_usd, cost_usd, now() as backed_up_at
  from public.products
  where archived_at is null and ((currency = 'USD' and cost_usd is null) or (currency <> 'USD' and cost is null));
update public.products p set price = 0, compare_at_price = null, price_usd = null, compare_usd = null
 where p.id in (select id from private.price_backup_20261031);
update public.product_variants v set price_override = null where v.product_id in (select id from private.price_backup_20261031) and price_override is not null;
-- لا يمكن طلب منتج سعره صفر (place_order و place_order_guest: v.price <= 0 ← منتج غير متاح)
create or replace view public.category_product_counts as
 select pc.category_id, count(*)::integer as n
   from public.product_categories pc join public.products p on p.id = pc.product_id
  where p.archived_at is null and p.is_online and p.price > 0
  group by pc.category_id;
