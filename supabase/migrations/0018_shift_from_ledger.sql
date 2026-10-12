-- الوردية تُحسب من حركة الصندوق الفعلية (كل ما دخل وخرج من صندوق المحل)
-- يشمل: المبيعات النقدية، المرتجعات، المصاريف، دفعات الموردين، التحويلات والسحوبات
create or replace function public.shift_summary()
returns table (shift_id uuid, opened_at timestamptz, opened_by_name text, opening numeric, cash_sales numeric, cash_expenses numeric, expected numeric)
language sql stable security definer set search_path = public as $$
  with s as (select * from public.cash_shifts where closed_at is null),
  mv as (
    select
      coalesce(sum(l.debit - l.credit) filter (where e.source in ('sale', 'sale_return', 'store_return')), 0) as sales,
      coalesce(sum(l.credit - l.debit) filter (where e.source not in ('sale', 'sale_return', 'store_return', 'shift')), 0) as outs
    from s join public.journal_entries e on e.created_at >= s.opened_at
    join public.journal_lines l on l.entry_id = e.id and l.account_code = '1110')
  select s.id, s.opened_at, pr.full_name, s.opening, mv.sales, mv.outs, s.opening + mv.sales - mv.outs
  from s cross join mv left join public.profiles pr on pr.id = s.opened_by
  where public.is_staff();
$$;
