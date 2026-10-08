-- صور المنتجات والأقسام والبانرات: حاوية تخزين عامة القراءة، الرفع لفريق العمل فقط
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
create policy "media staff upload" on storage.objects for insert with check (bucket_id = 'media' and public.is_staff());
create policy "media staff update" on storage.objects for update using (bucket_id = 'media' and public.is_staff());
create policy "media staff delete" on storage.objects for delete using (bucket_id = 'media' and public.is_staff());
create policy "media staff read" on storage.objects for select using (bucket_id = 'media' and public.is_staff());
