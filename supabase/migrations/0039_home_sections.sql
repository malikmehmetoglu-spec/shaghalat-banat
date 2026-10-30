-- إعدادات أقسام الصفحة الرئيسية (عروض اليوم وبانر التشكيلة)
alter table public.store_profile add column if not exists home jsonb not null default '{}'::jsonb;
