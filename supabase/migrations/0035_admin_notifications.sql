-- نوع إشعار لفريق الإدارة (تذكير الرواتب وغيره)
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('order', 'offer', 'new', 'admin'));
