-- إخفاء لون/مقاس له تاريخ حركات بدل حذفه (الحذف الفعلي ممنوع بسبب الحركات)
alter table public.product_variants add column if not exists archived_at timestamptz;
-- place_order / place_order_guest: pv.archived_at is null
