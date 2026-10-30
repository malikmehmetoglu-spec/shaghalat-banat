-- بيان الراتب باسم الشهر («شهر أكتوبر 2026») بدل 2026-10 الذي ينقلب في الاتجاه العربي
create or replace function public.pay_salary(p_salary uuid, p_period text, p_amount numeric, p_paid_from text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.staff_salaries; e uuid; x uuid; mname text;
begin
  perform public.require_finance();
  select * into s from public.staff_salaries where id = p_salary;
  if s.id is null then raise exception 'الموظفة غير موجودة'; end if;
  if p_period !~ '^\d{4}-\d{2}$' then raise exception 'الشهر غير صحيح'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if p_paid_from not in ('1110', '1120', '3100') then raise exception 'اختر من أين دُفع الراتب'; end if;
  if exists (select 1 from public.salary_payments where salary_id = s.id and period = p_period) then raise exception 'راتب هذا الشهر مدفوع مسبقاً'; end if;
  mname := (array['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'])[substr(p_period, 6, 2)::int] || ' ' || substr(p_period, 1, 4);
  e := public._post_entry(current_date, 'راتب ' || s.name || ' · شهر ' || mname || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'salary', s.id::text, jsonb_build_array(
    jsonb_build_object('account', '5200', 'debit', p_amount),
    jsonb_build_object('account', p_paid_from, 'credit', p_amount)));
  insert into public.salary_payments (salary_id, period, amount, paid_from, entry_id, created_by)
  values (s.id, p_period, p_amount, p_paid_from, e, auth.uid()) returning id into x;
  return x;
end $$;
