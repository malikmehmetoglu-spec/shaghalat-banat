-- باركود تلقائي لكل قطعة (لون/مقاس): 12 رقماً تبدأ بـ 20 (نطاق الاستخدام الداخلي) + رقم تحقق.
-- 12 رقماً زوجياً ⇒ يُطبع بترميز Code128-C الكثيف فيبقى مقروءاً على ملصقات 40×30 مم.
create sequence if not exists public.barcode_seq start 100001;

create or replace function public.next_barcode()
returns text language plpgsql security definer set search_path = public as $$
declare base text; s int := 0; i int;
begin
  base := '20' || lpad(nextval('public.barcode_seq')::text, 9, '0');
  for i in 1..11 loop
    s := s + substr(base, i, 1)::int * case when i % 2 = 1 then 1 else 3 end;
  end loop;
  return base || ((10 - s % 10) % 10)::text;
end $$;

create or replace function public._variant_barcode()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.barcode is null or btrim(new.barcode) = '' then new.barcode := public.next_barcode(); end if;
  return new;
end $$;
create trigger product_variants_barcode before insert on public.product_variants
  for each row execute function public._variant_barcode();

-- توحيد الباركودات الحالية (بيانات تجريبية) على نفس النظام
update public.product_variants set barcode = public.next_barcode() where barcode is null or barcode like '629%';
