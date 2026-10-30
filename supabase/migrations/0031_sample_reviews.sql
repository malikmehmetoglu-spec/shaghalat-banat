-- آراء تجريبية لمعاينة مكان قسم «قالوا عنّا» — لا يراها إلا فريق العمل، والزبونات لا يرينها أبداً
alter table public.testimonials add column if not exists is_sample boolean not null default false;
drop policy if exists "testimonials public read" on public.testimonials;
create policy "testimonials public read" on public.testimonials for select
  using ((is_visible and not is_sample) or public.is_staff());

insert into public.testimonials (name, city, body, rating, is_sample) values
  ('رنا', 'دمشق', 'القطعة أجمل من الصور، والتغليف كان أنيقاً ومحايداً تماماً. وصلت خلال يومين.', 5, true),
  ('لمى', 'حلب', 'تعامل راقٍ جداً من خدمة العملاء، ساعدوني باختيار المقاس الصحيح على واتساب.', 5, true),
  ('هبة', 'اللاذقية', 'العباية خامتها ممتازة وخياطتها نظيفة، رح كون زبونة دائمة.', 5, true),
  ('سارة', 'حمص', 'طقم العرس كان مثل ما تخيّلته بالضبط، شكراً على الاهتمام بالتفاصيل.', 4, true),
  ('نور', 'طرطوس', 'الدفع بشام كاش كان سهل، وتأكدوا من الطلب بسرعة.', 5, true);
