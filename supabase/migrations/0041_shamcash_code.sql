-- كود حساب شام كاش للنسخ عند التحويل
alter table public.store_profile add column if not exists shamcash_code text;
