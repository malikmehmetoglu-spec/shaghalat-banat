-- روابط المنتجات قصيرة بحروف إنجليزية: /p/k7x2a9
alter table public.products add column if not exists old_slug text;
create or replace function private.short_code() returns text language sql volatile set search_path = public as $$
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (floor(random() * 31) + 1)::int, 1), '') from generate_series(1, 6)
$$;
update public.products set old_slug = slug, slug = private.short_code() where slug !~ '^[a-z0-9]{6}$' and old_slug is null;

-- روابط الأقسام بالإنجليزية القصيرة
update public.categories set slug = v.s from (values
  ('حجابات-uuj5','hijabs'), ('ألبسة-شرعية-uh5q','modest'), ('عرائسي-ohte','bridal'), ('كاب-شتوي-236l','caps'),
  ('نظارات-dl7o','glasses'), ('داخليات-exvj','underwear'), ('مشالح-عروس-exns','capes'), ('makeup-tjjg','makeup')
) as v(o, s) where categories.slug = v.o;
