-- ═══════════ المالية المبسّطة ═══════════
-- ثلاثة أماكن للمال: شام كاش (1120) · صندوق المحل (1110) · المال الخاص (حقوق المالك 3100 إضافات / 3200 سحب)
-- + الرواتب الثابتة · المشتريات عند إدخال البضاعة · البيع بالأمانة
-- القيد المزدوج يبقى في الخلفية كما هو؛ الواجهة فقط تبسّطت.

update public.accounts set name = 'شام كاش' where code = '1120';
update public.accounts set name = 'المال الخاص · ما أضافه المالك' where code = '3100';
update public.accounts set name = 'المال الخاص · ما سحبه المالك' where code = '3200';
insert into public.accounts (code, name, type, is_cash, is_expense_category, is_system) values
  ('2300', 'مستحق لتجار الأمانة', 'liability', false, false, true),
  ('4300', 'عمولات البيع بالأمانة', 'revenue', false, false, true)
on conflict (code) do nothing;

-- ── المصروف: يمكن دفعه من المال الخاص (يُحسب على المتجر ولا يُنقص الصندوقين) ──
create or replace function public.record_expense(p_date date, p_category text, p_description text, p_amount numeric, p_paid_from text, p_recurring boolean default false, p_receipt text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; x uuid;
begin
  perform public.require_finance();
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if p_paid_from not in ('1110', '1120', '3100') then raise exception 'اختر من أين دُفع المبلغ'; end if;
  if not exists (select 1 from public.accounts where code = p_category and type = 'expense') then raise exception 'اختر نوع المصروف'; end if;
  e := public._post_entry(p_date, 'مصروف: ' || p_description, 'expense', null, jsonb_build_array(
    jsonb_build_object('account', p_category, 'debit', p_amount),
    jsonb_build_object('account', p_paid_from, 'credit', p_amount)));
  insert into public.expenses (expense_date, category, description, amount, paid_from, is_recurring, receipt_url, entry_id, created_by)
  values (coalesce(p_date, current_date), p_category, p_description, p_amount, p_paid_from, coalesce(p_recurring, false), p_receipt, e, auth.uid())
  returning id into x;
  update public.journal_entries set source_id = x::text where id = e;
  return x;
end $$;

-- ── الرواتب الثابتة ──
create table if not exists public.staff_salaries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'SYP' check (currency in ('SYP', 'USD')),
  pay_day smallint not null check (pay_day between 1 and 28),
  is_active boolean not null default true,
  reminded_period text,
  created_at timestamptz not null default now()
);
create table if not exists public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  salary_id uuid not null references public.staff_salaries(id) on delete cascade,
  period text not null,                       -- YYYY-MM
  amount numeric(14,2) not null check (amount > 0),   -- بالليرة
  paid_from text not null,
  entry_id uuid references public.journal_entries(id) on delete set null,
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique (salary_id, period)
);
alter table public.staff_salaries enable row level security;
alter table public.salary_payments enable row level security;
create policy "salaries finance" on public.staff_salaries for all using (public.is_finance()) with check (public.is_finance());
create policy "salary payments finance" on public.salary_payments for all using (public.is_finance()) with check (public.is_finance());

create or replace function public.pay_salary(p_salary uuid, p_period text, p_amount numeric, p_paid_from text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.staff_salaries; e uuid; x uuid;
begin
  perform public.require_finance();
  select * into s from public.staff_salaries where id = p_salary;
  if s.id is null then raise exception 'الموظفة غير موجودة'; end if;
  if p_period !~ '^\d{4}-\d{2}$' then raise exception 'الشهر غير صحيح'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if p_paid_from not in ('1110', '1120', '3100') then raise exception 'اختر من أين دُفع الراتب'; end if;
  if exists (select 1 from public.salary_payments where salary_id = s.id and period = p_period) then raise exception 'راتب هذا الشهر مدفوع مسبقاً'; end if;
  e := public._post_entry(current_date, 'راتب ' || s.name || ' · ' || p_period || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'salary', s.id::text, jsonb_build_array(
    jsonb_build_object('account', '5200', 'debit', p_amount),
    jsonb_build_object('account', p_paid_from, 'credit', p_amount)));
  insert into public.salary_payments (salary_id, period, amount, paid_from, entry_id, created_by)
  values (s.id, p_period, p_amount, p_paid_from, e, auth.uid()) returning id into x;
  return x;
end $$;

-- ── البيع بالأمانة ──
create table if not exists public.consignors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  mode text not null default 'percent' check (mode in ('percent', 'net')),   -- نسبة من سعر البيع · أو سعر صافٍ للتاجر (= سعر التكلفة في المنتج)
  commission_pct numeric(5,2) not null default 30 check (commission_pct between 0 and 100),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.consignors enable row level security;
create policy "consignors staff" on public.consignors for all using (public.is_staff()) with check (public.is_staff());
alter table public.products add column if not exists consignor_id uuid references public.consignors(id) on delete set null;
alter table public.order_items add column if not exists consignor_id uuid references public.consignors(id) on delete set null;
alter table public.order_items add column if not exists consignor_share numeric(14,2);

-- قيد البيع: بضاعة الأمانة لا تُحسب إيراداً كاملاً ولا تكلفة بضاعة؛ حصة التاجر دَين عليه (2300) والعمولة إيراد (4300)
-- الخصم يتحمّله المتجر (حصة التاجر محسوبة على سعر البيع قبل الخصم)
create or replace function public._post_order(p_order uuid, p_reverse boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; debit_acc text; rev_acc text; net numeric; cogs numeric; lines jsonb; src text;
  consign_gross numeric := 0; consign_share numeric := 0; own_rev numeric; r record;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null or o.total <= 0 then return; end if;
  src := case when p_reverse then 'sale_return' else 'sale' end;
  if exists (select 1 from public.journal_entries where source = src and source_id = o.id::text) then return; end if;
  if p_reverse and not exists (select 1 from public.journal_entries where source = 'sale' and source_id = o.id::text) then return; end if;

  -- لقطة حصة التاجر عند البيع (تُستخدم كما هي في المرتجع)
  if not p_reverse then
    update public.order_items oi set consignor_id = c.id,
      consignor_share = round(case when c.mode = 'net' then coalesce(p.cost, 0) * oi.qty else oi.unit_price * oi.qty * (1 - c.commission_pct / 100) end, 2)
      from public.product_variants pv join public.products p on p.id = pv.product_id join public.consignors c on c.id = p.consignor_id
     where oi.order_id = o.id and pv.id = oi.variant_id and oi.consignor_share is null;
  end if;

  rev_acc := case when o.channel = 'online' then '4100' else '4200' end;
  debit_acc := case
    when o.payment_method = 'cash' then '1110'
    when o.payment_method::text in ('card', 'transfer', 'shamcash', 'support') then '1120'
    else '1130' end;
  net := o.subtotal - o.discount;
  select coalesce(sum(oi.unit_price * oi.qty), 0), coalesce(sum(oi.consignor_share), 0) into consign_gross, consign_share
    from public.order_items oi where oi.order_id = o.id and oi.consignor_id is not null;
  own_rev := net - consign_gross;            -- إيراد بضاعة المتجر بعد الخصم كاملاً
  select coalesce(sum(oi.qty * coalesce(p.cost, 0)), 0) into cogs
    from public.order_items oi join public.product_variants pv on pv.id = oi.variant_id join public.products p on p.id = pv.product_id
   where oi.order_id = o.id and oi.consignor_id is null;

  lines := jsonb_build_array(
    jsonb_build_object('account', debit_acc, 'debit', o.total, 'party_type', case when debit_acc = '1130' then 'courier' end, 'party_id', case when debit_acc = '1130' then o.id::text end, 'party_name', case when debit_acc = '1130' then o.number end),
    case when own_rev >= 0 then jsonb_build_object('account', rev_acc, 'credit', own_rev) else jsonb_build_object('account', rev_acc, 'debit', -own_rev) end,
    jsonb_build_object('account', '4300', 'credit', consign_gross - consign_share),
    jsonb_build_object('account', '4400', 'credit', o.shipping),
    jsonb_build_object('account', '5100', 'debit', cogs),
    jsonb_build_object('account', '1200', 'credit', cogs));
  for r in select oi.consignor_id cid, c.name cname, sum(oi.consignor_share) s
             from public.order_items oi join public.consignors c on c.id = oi.consignor_id
            where oi.order_id = o.id group by oi.consignor_id, c.name loop
    lines := lines || jsonb_build_array(jsonb_build_object('account', '2300', 'credit', r.s, 'party_type', 'consignor', 'party_id', r.cid::text, 'party_name', r.cname));
  end loop;
  if p_reverse then
    select jsonb_agg(x - 'debit' - 'credit' || jsonb_build_object('debit', coalesce(x->>'credit', '0'), 'credit', coalesce(x->>'debit', '0'))) into lines
      from jsonb_array_elements(lines) x;
  end if;
  perform public._post_entry(current_date,
    case when p_reverse then 'مرتجع الطلب ' else (case when o.channel = 'online' then 'مبيعات أونلاين — طلب ' else 'بيع في المحل — فاتورة ' end) end || o.number,
    src, o.id::text, lines);
end $$;

create or replace function public.consignor_payout(p_consignor uuid, p_amount numeric, p_paid_from text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.consignors; due numeric;
begin
  perform public.require_finance();
  select * into c from public.consignors where id = p_consignor;
  if c.id is null then raise exception 'التاجر غير موجود'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if p_paid_from not in ('1110', '1120', '3100') then raise exception 'اختر من أين دُفع المبلغ'; end if;
  select coalesce(sum(credit - debit), 0) into due from public.journal_lines where account_code = '2300' and party_id = c.id::text;
  if p_amount > due + 0.01 then raise exception 'المبلغ أكبر من المستحق للتاجر (%)', to_char(due, 'FM999,999,999,990'); end if;
  return public._post_entry(current_date, 'دفع مستحقات ' || c.name || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'consign_payout', c.id::text, jsonb_build_array(
    jsonb_build_object('account', '2300', 'debit', p_amount, 'party_type', 'consignor', 'party_id', c.id::text, 'party_name', c.name),
    jsonb_build_object('account', p_paid_from, 'credit', p_amount)));
end $$;

-- ── المشتريات: إدخال البضاعة + خروج ثمنها في حركة واحدة ──
-- p_items: [{variant, loc, qty}] · p_paid_from: 1110 / 1120 / 3100 / none (بضاعة موجودة سابقاً أو مدفوعة)
-- بضاعة الأمانة تدخل المخزون بلا أي مال
create or replace function public.stock_purchase(p_items jsonb, p_paid_from text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; v record; q int; total numeric := 0; unpriced int := 0; consign int := 0; ref text;
begin
  perform public.require_staff();
  if p_paid_from not in ('1110', '1120', '3100', 'none') then raise exception 'اختر من أين دُفع ثمن البضاعة'; end if;
  ref := 'PUR-' || to_char(now(), 'YYMMDDHH24MISS');
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    q := floor((it->>'qty')::numeric);
    if q is null or q <= 0 then continue; end if;
    select pv.id, p.name, p.cost, p.consignor_id into v from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = (it->>'variant')::uuid;
    if v.id is null then raise exception 'منتج غير موجود'; end if;
    insert into public.stock_levels (variant_id, location_id, on_hand) values (v.id, (it->>'loc')::uuid, q)
      on conflict (variant_id, location_id) do update set on_hand = public.stock_levels.on_hand + excluded.on_hand;
    insert into public.stock_movements (variant_id, to_location, qty, kind, reference, note, created_by)
    values (v.id, (it->>'loc')::uuid, q, 'in', ref, coalesce(nullif(trim(p_note), ''), case when v.consignor_id is not null then 'بضاعة أمانة' else 'إدخال بضاعة' end), auth.uid());
    if v.consignor_id is not null then consign := consign + q;
    elsif coalesce(v.cost, 0) <= 0 then unpriced := unpriced + q;
    else total := total + v.cost * q; end if;
  end loop;
  if total > 0 and p_paid_from <> 'none' then
    perform public._post_entry(current_date, 'شراء بضاعة' || coalesce(' — ' || nullif(trim(p_note), ''), ''), 'purchase_stock', ref, jsonb_build_array(
      jsonb_build_object('account', '1200', 'debit', total),
      jsonb_build_object('account', p_paid_from, 'credit', total)));
  end if;
  return jsonb_build_object('total', total, 'unpriced', unpriced, 'consign', consign, 'ref', ref);
end $$;

-- ── تذكير الرواتب: المستحقة خلال 3 أيام أو المتأخرة ولم تُدفع هذا الشهر (بتوقيت دمشق) ──
create or replace function public.salaries_due(p_days int default 3)
returns table (id uuid, name text, amount numeric, currency text, pay_day smallint, period text, due_date date, days_left int, reminded boolean)
language sql stable security definer set search_path = public as $$
  with t as (select (now() at time zone 'Asia/Damascus')::date d)
  select s.id, s.name, s.amount, s.currency, s.pay_day, to_char(t.d, 'YYYY-MM'),
         make_date(extract(year from t.d)::int, extract(month from t.d)::int, s.pay_day),
         (make_date(extract(year from t.d)::int, extract(month from t.d)::int, s.pay_day) - t.d)::int,
         s.reminded_period = to_char(t.d, 'YYYY-MM')
    from public.staff_salaries s cross join t
   where s.is_active and (public.is_finance() or auth.role() = 'service_role')
     and not exists (select 1 from public.salary_payments sp where sp.salary_id = s.id and sp.period = to_char(t.d, 'YYYY-MM'))
     and make_date(extract(year from t.d)::int, extract(month from t.d)::int, s.pay_day) - t.d <= p_days
   order by 7;
$$;
revoke execute on function public.pay_salary(uuid, text, numeric, text, text), public.consignor_payout(uuid, numeric, text, text),
  public.stock_purchase(jsonb, text, text), public.salaries_due(int) from public, anon;
grant execute on function public.pay_salary(uuid, text, numeric, text, text), public.consignor_payout(uuid, numeric, text, text),
  public.stock_purchase(jsonb, text, text), public.salaries_due(int) to authenticated, service_role;
