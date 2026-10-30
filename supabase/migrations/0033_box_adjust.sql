-- ضبط رصيد صندوق ليطابق الواقع (مرة عند البداية أو عند الحاجة) — للمالك فقط
-- الفرق يُسجَّل على «المال الخاص» فلا يظهر ربحاً ولا خسارة
create or replace function public.box_adjust(p_box text, p_actual numeric, p_note text default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare cur numeric; diff numeric;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') then raise exception 'ضبط الرصيد متاح لصاحب المتجر فقط'; end if;
  if p_box not in ('1110', '1120') then raise exception 'اختر الصندوق'; end if;
  if p_actual is null or p_actual < 0 then raise exception 'اكتب المبلغ الموجود فعلاً'; end if;
  select coalesce(sum(debit - credit), 0) into cur from public.journal_lines where account_code = p_box;
  diff := round(p_actual - cur, 2);
  if diff = 0 then return 0; end if;
  perform public._post_entry(current_date, 'ضبط رصيد ' || (select name from public.accounts where code = p_box) || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'adjust', p_box,
    case when diff > 0 then jsonb_build_array(jsonb_build_object('account', p_box, 'debit', diff), jsonb_build_object('account', '3100', 'credit', diff))
         else jsonb_build_array(jsonb_build_object('account', '3100', 'debit', -diff), jsonb_build_object('account', p_box, 'credit', -diff)) end);
  return diff;
end $$;
revoke execute on function public.box_adjust(text, numeric, text) from public, anon;
grant execute on function public.box_adjust(text, numeric, text) to authenticated;
