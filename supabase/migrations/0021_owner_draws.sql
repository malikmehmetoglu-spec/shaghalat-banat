-- سحب المالك إلى خزنته الشخصية (نهائياً): للمالك فقط، بمصدر مستقل owner_draw
-- محاسبياً: مدين «المسحوبات الشخصية» 3200 / دائن الصندوق أو البنك — لا يُنقص الربح
create or replace function public.cash_move(p_kind text, p_amount numeric, p_from text, p_to text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare bal numeric;
begin
  perform public.require_finance();
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if p_kind = 'transfer' then
    if p_from = p_to then raise exception 'اختاري حسابين مختلفين'; end if;
    return public._post_entry(current_date, coalesce(nullif(p_note, ''), 'تحويل بين الحسابات'), 'transfer', null, jsonb_build_array(
      jsonb_build_object('account', p_to, 'debit', p_amount), jsonb_build_object('account', p_from, 'credit', p_amount)));
  elsif p_kind = 'deposit' then
    return public._post_entry(current_date, coalesce(nullif(p_note, ''), 'إيداع رأس مال'), 'transfer', null, jsonb_build_array(
      jsonb_build_object('account', p_to, 'debit', p_amount), jsonb_build_object('account', '3100', 'credit', p_amount)));
  elsif p_kind = 'withdraw' then
    if not exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') then
      raise exception 'السحب إلى الخزنة الشخصية مخصّص لصاحب المتجر فقط';
    end if;
    if p_from is null or p_from not in ('1110', '1120') then raise exception 'اختر الصندوق أو البنك'; end if;
    select coalesce(sum(debit - credit), 0) into bal from public.journal_lines where account_code = p_from;
    if p_amount > bal then raise exception 'المبلغ أكبر من الموجود (%)', to_char(bal, 'FM999,999,999,990'); end if;
    return public._post_entry(current_date, coalesce(nullif(p_note, ''), 'سحب إلى الخزنة الشخصية'), 'owner_draw', null, jsonb_build_array(
      jsonb_build_object('account', '3200', 'debit', p_amount), jsonb_build_object('account', p_from, 'credit', p_amount)));
  end if;
  raise exception 'نوع حركة غير معروف';
end $$;

-- الوردية: مسحوبات المالك في سطر مستقل عن المصاريف
drop function if exists public.shift_summary();
create function public.shift_summary()
returns table (shift_id uuid, opened_at timestamptz, opened_by_name text, opening numeric, cash_sales numeric, cash_expenses numeric, expected numeric, cash_draws numeric)
language sql stable security definer set search_path = public as $$
  with s as (select * from public.cash_shifts where closed_at is null),
  mv as (
    select
      coalesce(sum(l.debit - l.credit) filter (where e.source in ('sale', 'sale_return', 'store_return')), 0) as sales,
      coalesce(sum(l.credit - l.debit) filter (where e.source not in ('sale', 'sale_return', 'store_return', 'shift', 'owner_draw')), 0) as outs,
      coalesce(sum(l.credit - l.debit) filter (where e.source = 'owner_draw'), 0) as draws
    from s join public.journal_entries e on e.created_at >= s.opened_at
    join public.journal_lines l on l.entry_id = e.id and l.account_code = '1110')
  select s.id, s.opened_at, pr.full_name, s.opening, mv.sales, mv.outs, s.opening + mv.sales - mv.outs - mv.draws, mv.draws
  from s cross join mv left join public.profiles pr on pr.id = s.opened_by
  where public.is_staff();
$$;
revoke execute on function public.shift_summary() from public, anon;
grant execute on function public.shift_summary() to authenticated;
