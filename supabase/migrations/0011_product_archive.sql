-- حذف المنتج = أرشفته (يختفي من كل مكان مع بقاء سجل الطلبات والحركات سليماً)
alter table public.products add column if not exists archived_at timestamptz;
