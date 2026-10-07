-- بيانات تجريبية للعرض — تُستبدل بالمنتجات الحقيقية لاحقاً من لوحة الإدارة.

insert into public.locations (name, kind, address, sells_online) values
  ('المستودع الرئيسي', 'warehouse', '[عنوان المستودع]', true),
  ('المحل', 'store', '[عنوان المحل]', true),
  ('قيد الشحن والإرجاع', 'transit', null, false);

insert into public.categories (slug, name, name_en, sort_order) values
  ('lingerie', 'لانجري', 'Lingerie', 1),
  ('abayas', 'عبايات', 'Abayas', 2),
  ('perfumes', 'عطور', 'Perfumes', 3),
  ('pajamas', 'بيجامات', 'Pajamas', 4),
  ('accessories', 'إكسسوارات', 'Accessories', 5),
  ('beauty', 'عناية وجمال', 'Beauty', 6);

insert into public.shipping_methods (code, name, description, price, sort_order) values
  ('standard', 'شحن عادي', '2 إلى 4 أيام عمل', 25, 1),
  ('express', 'شحن سريع', 'خلال 24 ساعة', 35, 2),
  ('same_day', 'توصيل في نفس اليوم', 'للطلبات قبل 2 ظهراً', 60, 3);

insert into public.coupons (code, description, kind, value, min_order) values
  ('BANAT10', 'خصم 10% على كل الطلبات', 'percent', 10, 0),
  ('WELCOME15', '15% لأول طلب', 'percent', 15, 0);

insert into public.banners (kicker, title, link, sort_order) values
  ('عرض الموسم', 'خصم حتى 30% على العبايات', '/c/abayas', 1),
  ('وصل حديثاً', 'تشكيلة الساتان الجديدة', '/c/lingerie', 2);

-- المنتجات: (القسم، الرابط، الاسم، الوصف المختصر، السعر، الوسم، المقاسات، الألوان)
do $$
declare
  r record;
  pid uuid;
  sz text;
  n int := 0;
  wh uuid := (select id from public.locations where kind = 'warehouse');
  st uuid := (select id from public.locations where kind = 'store');
  vid uuid;
begin
  for r in select * from (values
    ('abayas','pearl-abaya','عباية لؤلؤ','كريب ملكي',450,'جديد',array['S','M','L','XL'],array['توتي:#8E0254','ماجنتا:#D6037F','أسود:#2A2024'],
      'عباية من قماش الكريب الملكي بقصّة واسعة وانسيابية، مزيّنة بحبات لؤلؤ يدوية على الأكمام. مناسبة للمناسبات والسهرات، وتأتي مع طرحة بنفس اللون.'),
    ('abayas','night-abaya','عباية الليل','شيفون',380,null,array['M','L','XL'],array['أسود:#2A2024'],
      'عباية شيفون خفيفة بطبقتين، مثالية للسهرات الصيفية.'),
    ('abayas','rose-abaya','عباية الورد','مطرّزة يدوياً',520,'الأكثر مبيعاً',array['S','M','L'],array['وردي:#E85FA8'],
      'تطريز ورود يدوي على الأكمام والصدر، قماش كريب ناعم.'),
    ('lingerie','satin-set','طقم ساتان','لانجري حريري',220,'جديد',array['S','M','L'],array['وردي فاتح:#F3C1C3','توتي:#8E0254'],
      'طقم ساتان ناعم من قطعتين بلمسة حريرية وأطراف دانتيل.'),
    ('lingerie','lace-robe','روب دانتيل','دانتيل فرنسي',260,null,array['M','L'],array['أسود:#2A2024','وردي:#E85FA8'],
      'روب خفيف من الدانتيل مع حزام ساتان.'),
    ('perfumes','rose-perfume','عطر وردة','50 مل',310,null,array['50 مل'],array[]::text[],
      'عطر زهري بنفحات الورد الدمشقي والمسك الأبيض، ثبات يدوم طويلاً.'),
    ('pajamas','soft-pajama','بيجاما نعومة','قطن ناعم',180,'خصم 20%',array['S','M','L'],array['توتي:#8E0254','وردي فاتح:#F3C1C3'],
      'بيجاما قطنية مريحة بقصّة واسعة، مناسبة لكل الفصول.'),
    ('accessories','pearl-necklace','طوق لؤلؤ','مقاس واحد',95,null,array['مقاس واحد'],array[]::text[],
      'طوق لؤلؤ صناعي بلمعة طبيعية، يناسب الإطلالات اليومية والسهرات.')
  ) as t(cat, slug, name, sub, price, tag, sizes, colors, descr) loop
    n := n + 1;
    insert into public.products (category_id, slug, name, subtitle, description, price, compare_at_price, cost, tag, rating, rating_count)
    values ((select id from public.categories where slug = r.cat), r.slug, r.name, r.sub, r.descr, r.price,
            case when r.tag like 'خصم%' then round(r.price / 0.8) end, round(r.price * 0.47),
            r.tag, 4.4 + (n % 6) / 10.0, 20 + n * 13)
    returning id into pid;

    foreach sz in array r.sizes loop
      if array_length(r.colors, 1) is null then
        insert into public.product_variants (product_id, sku, barcode, size)
        values (pid, upper(r.slug) || '-' || sz, '62910415' || lpad((n * 100 + floor(random() * 99))::text, 5, '0'), sz)
        returning id into vid;
        insert into public.stock_levels values (vid, wh, 3 + floor(random() * 15)::int, 0, 5), (vid, st, floor(random() * 6)::int, 0, 2);
      end if; -- المنتجات ذات الألوان تُنشأ متغيراتها في الكتلة التالية
    end loop;
  end loop;
end $$;

-- متغيرات المنتجات ذات الألوان (مقاس × لون)
do $$
declare
  p record; sz text; c text; parts text[];
  wh uuid := (select id from public.locations where kind = 'warehouse');
  st uuid := (select id from public.locations where kind = 'store');
  vid uuid; k int := 0;
  spec jsonb := '{
    "pearl-abaya": {"sizes":["S","M","L","XL"],"colors":["توتي:#8E0254","ماجنتا:#D6037F","أسود:#2A2024"]},
    "night-abaya": {"sizes":["M","L","XL"],"colors":["أسود:#2A2024"]},
    "rose-abaya": {"sizes":["S","M","L"],"colors":["وردي:#E85FA8"]},
    "satin-set": {"sizes":["S","M","L"],"colors":["وردي فاتح:#F3C1C3","توتي:#8E0254"]},
    "lace-robe": {"sizes":["M","L"],"colors":["أسود:#2A2024","وردي:#E85FA8"]},
    "soft-pajama": {"sizes":["S","M","L"],"colors":["توتي:#8E0254","وردي فاتح:#F3C1C3"]}
  }';
begin
  for p in select id, slug from public.products where spec ? slug loop
    for sz in select jsonb_array_elements_text(spec->p.slug->'sizes') loop
      for c in select jsonb_array_elements_text(spec->p.slug->'colors') loop
        k := k + 1;
        parts := string_to_array(c, ':');
        insert into public.product_variants (product_id, sku, barcode, size, color_name, color_hex)
        values (p.id, upper(p.slug) || '-' || sz || '-' || k, '629104' || lpad(k::text, 7, '0'), sz, parts[1], parts[2])
        returning id into vid;
        insert into public.stock_levels values
          (vid, wh, (k * 7) % 9, 0, 3),
          (vid, st, (k * 5) % 4, 0, 1);
      end loop;
    end loop;
  end loop;
end $$;
