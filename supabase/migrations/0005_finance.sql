-- المرحلة 3: المالية والمحاسبة (قيد مزدوج) + المرتجعات + إعدادات
-- معظم القيود تُنشأ تلقائياً: البيع (تسليم الطلب / بيع المحل)، المرتجع، استلام المشتريات، المصاريف، الدفعات.

create or replace function public.is_finance()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role()::text in ('owner', 'accountant'), false);
$$;
create or replace function public.require_finance()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_finance() then raise exception 'هذه العملية مخصّصة للمديرة والمحاسبة'; end if;
end $$;

-- ───────── دليل الحسابات ─────────
create type public.account_type as enum ('asset', 'liability', 'equity', 'revenue', 'expense');
create table public.accounts (
  code text primary key,
  name text not null,
  type public.account_type not null,
  is_cash boolean not null default false,
  is_expense_category boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.accounts (code, name, type, is_cash, is_expense_category, is_system) values
  ('1110', 'صندوق المحل', 'asset', true, false, true),
  ('1120', 'الحساب البنكي', 'asset', true, false, true),
  ('1130', 'ذمم شركة التوصيل (عند الاستلام)', 'asset', false, false, true),
  ('1200', 'المخزون', 'asset', false, false, true),
  ('2100', 'ذمم الموردين', 'liability', false, false, true),
  ('2200', 'ضريبة مستحقة', 'liability', false, false, true),
  ('3100', 'رأس المال', 'equity', false, false, true),
  ('3200', 'المسحوبات الشخصية', 'equity', false, false, true),
  ('4100', 'مبيعات المتجر الإلكتروني', 'revenue', false, false, true),
  ('4200', 'مبيعات المحل', 'revenue', false, false, true),
  ('4400', 'إيراد الشحن', 'revenue', false, false, true),
  ('4900', 'إيرادات أخرى (فائض صندوق)', 'revenue', false, false, true),
  ('5100', 'تكلفة البضاعة المباعة', 'expense', false, false, true),
  ('5200', 'الرواتب', 'expense', false, true, false),
  ('5300', 'الإيجار', 'expense', false, true, false),
  ('5400', 'التسويق والإعلانات', 'expense', false, true, false),
  ('5500', 'الشحن والتوصيل', 'expense', false, true, false),
  ('5600', 'الكهرباء والإنترنت', 'expense', false, true, false),
  ('5700', 'التغليف', 'expense', false, true, false),
  ('5900', 'مصاريف أخرى وعجز صندوق', 'expense', false, true, true);

-- ───────── القيود ─────────
create sequence public.journal_number_seq start 1001;
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('JV-' || nextval('public.journal_number_seq')),
  entry_date date not null default current_date,
  memo text not null,
  source text not null default 'manual',   -- manual | sale | sale_return | purchase | expense | payment | transfer | shift
  source_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index journal_auto_once on public.journal_entries (source, source_id) where source in ('sale', 'sale_return', 'purchase');
create index journal_date_idx on public.journal_entries (entry_date);

create table public.journal_lines (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_code text not null references public.accounts(code),
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  party_type text,     -- supplier | courier
  party_id text,
  party_name text
);
create index journal_lines_acc_idx on public.journal_lines (account_code);

-- ترحيل داخلي (بدون تحقق صلاحيات — تستدعيه دوال/مشغّلات موثوقة فقط)
create or replace function public._post_entry(p_date date, p_memo text, p_source text, p_source_id text, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; l jsonb; dr numeric := 0; cr numeric := 0;
begin
  for l in select * from jsonb_array_elements(p_lines) loop
    dr := dr + coalesce((l->>'debit')::numeric, 0);
    cr := cr + coalesce((l->>'credit')::numeric, 0);
  end loop;
  if round(dr, 2) <> round(cr, 2) then raise exception 'القيد غير متوازن (مدين % ≠ دائن %)', dr, cr; end if;
  if dr = 0 then return null; end if;
  insert into public.journal_entries (entry_date, memo, source, source_id, created_by)
  values (coalesce(p_date, current_date), p_memo, p_source, p_source_id, auth.uid()) returning id into e;
  insert into public.journal_lines (entry_id, account_code, debit, credit, party_type, party_id, party_name)
  select e, x->>'account', coalesce((x->>'debit')::numeric, 0), coalesce((x->>'credit')::numeric, 0),
         x->>'party_type', x->>'party_id', x->>'party_name'
    from jsonb_array_elements(p_lines) x
   where coalesce((x->>'debit')::numeric, 0) > 0 or coalesce((x->>'credit')::numeric, 0) > 0;
  return e;
end $$;

-- ───────── قيد البيع والمرتجع ─────────
create or replace function public._post_order(p_order uuid, p_reverse boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; debit_acc text; rev_acc text; net numeric; cogs numeric; lines jsonb; src text;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null or o.total <= 0 then return; end if;
  src := case when p_reverse then 'sale_return' else 'sale' end;
  if exists (select 1 from public.journal_entries where source = src and source_id = o.id::text) then return; end if;
  if p_reverse and not exists (select 1 from public.journal_entries where source = 'sale' and source_id = o.id::text) then return; end if;

  rev_acc := case when o.channel = 'online' then '4100' else '4200' end;
  debit_acc := case
    when o.payment_method = 'cash' then '1110'
    when o.payment_method in ('card', 'transfer') then '1120'
    else '1130' end;  -- الدفع عند الاستلام: المبلغ عند شركة التوصيل
  net := o.subtotal - o.discount;
  select coalesce(sum(oi.qty * coalesce(p.cost, 0)), 0) into cogs
    from public.order_items oi join public.product_variants pv on pv.id = oi.variant_id join public.products p on p.id = pv.product_id
   where oi.order_id = o.id;

  lines := jsonb_build_array(
    jsonb_build_object('account', debit_acc, 'debit', o.total, 'party_type', case when debit_acc = '1130' then 'courier' end, 'party_id', case when debit_acc = '1130' then o.id::text end, 'party_name', case when debit_acc = '1130' then o.number end),
    jsonb_build_object('account', rev_acc, 'credit', net),
    jsonb_build_object('account', '4400', 'credit', o.shipping),
    jsonb_build_object('account', '5100', 'debit', cogs),
    jsonb_build_object('account', '1200', 'credit', cogs));
  if p_reverse then
    -- عكس المدين والدائن
    select jsonb_agg(x - 'debit' - 'credit' || jsonb_build_object('debit', coalesce(x->>'credit', '0'), 'credit', coalesce(x->>'debit', '0'))) into lines
      from jsonb_array_elements(lines) x;
  end if;
  perform public._post_entry(current_date,
    case when p_reverse then 'مرتجع الطلب ' else (case when o.channel = 'online' then 'مبيعات أونلاين — طلب ' else 'بيع في المحل — فاتورة ' end) end || o.number,
    src, o.id::text, lines);
end $$;

create or replace function public._orders_accounting()
returns trigger language plpgsql security definer set search_path = public as $$
declare st public.order_status;
begin
  select status into st from public.orders where id = new.id;  -- الحالة عند نهاية المعاملة
  if st = 'delivered' then perform public._post_order(new.id, false);
  elsif st = 'returned' then perform public._post_order(new.id, true);
  end if;
  return null;
end $$;
create constraint trigger orders_accounting after insert or update on public.orders
  deferrable initially deferred for each row execute function public._orders_accounting();

-- ───────── قيد استلام المشتريات + تحديث تكلفة المنتج ─────────
create or replace function public._po_accounting()
returns trigger language plpgsql security definer set search_path = public as $$
declare amt numeric; s public.suppliers;
begin
  if new.status = 'received' and old.status is distinct from 'received' then
    select coalesce(sum(received_qty * unit_cost), 0) into amt from public.po_items where po_id = new.id;
    select * into s from public.suppliers where id = new.supplier_id;
    perform public._post_entry(current_date, 'استلام بضاعة — ' || new.number || ' من ' || s.name, 'purchase', new.id::text,
      jsonb_build_array(
        jsonb_build_object('account', '1200', 'debit', amt),
        jsonb_build_object('account', '2100', 'credit', amt, 'party_type', 'supplier', 'party_id', s.id::text, 'party_name', s.name)));
    update public.products p set cost = x.c
      from (select pv.product_id, max(pi.unit_cost) c from public.po_items pi join public.product_variants pv on pv.id = pi.variant_id
             where pi.po_id = new.id and pi.unit_cost > 0 group by pv.product_id) x
     where p.id = x.product_id;
  end if;
  return new;
end $$;
create trigger po_accounting after update on public.purchase_orders for each row execute function public._po_accounting();

-- ───────── المصاريف ─────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null references public.accounts(code),
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  paid_from text not null references public.accounts(code),
  is_recurring boolean not null default false,
  receipt_url text,
  entry_id uuid references public.journal_entries(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.record_expense(p_date date, p_category text, p_description text, p_amount numeric, p_paid_from text, p_recurring boolean default false, p_receipt text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; x uuid;
begin
  perform public.require_finance();
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if not exists (select 1 from public.accounts where code = p_paid_from and is_cash) then raise exception 'اختاري حساب دفع صحيح'; end if;
  e := public._post_entry(p_date, 'مصروف: ' || p_description, 'expense', null, jsonb_build_array(
    jsonb_build_object('account', p_category, 'debit', p_amount),
    jsonb_build_object('account', p_paid_from, 'credit', p_amount)));
  insert into public.expenses (expense_date, category, description, amount, paid_from, is_recurring, receipt_url, entry_id, created_by)
  values (coalesce(p_date, current_date), p_category, p_description, p_amount, p_paid_from, coalesce(p_recurring, false), p_receipt, e, auth.uid())
  returning id into x;
  update public.journal_entries set source_id = x::text where id = e;
  return x;
end $$;

-- ───────── قيد يدوي ─────────
create or replace function public.post_manual_entry(p_date date, p_memo text, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public.require_finance();
  if coalesce(trim(p_memo), '') = '' then raise exception 'اكتبي بيان القيد'; end if;
  if jsonb_array_length(p_lines) < 2 then raise exception 'القيد يحتاج سطرين على الأقل'; end if;
  return public._post_entry(p_date, p_memo, 'manual', null, p_lines);
end $$;

-- ───────── الصندوق والبنوك: تحويل / إيداع / سحب ─────────
create or replace function public.cash_move(p_kind text, p_amount numeric, p_from text, p_to text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public.require_finance();
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if p_kind = 'transfer' then
    if p_from = p_to then raise exception 'اختاري حسابين مختلفين'; end if;
    return public._post_entry(current_date, coalesce(nullif(p_note, ''), 'تحويل بين الحسابات'), 'transfer', null, jsonb_build_array(
      jsonb_build_object('account', p_to, 'debit', p_amount), jsonb_build_object('account', p_from, 'credit', p_amount)));
  elsif p_kind = 'deposit' then  -- إيداع من المالكة (رأس مال)
    return public._post_entry(current_date, coalesce(nullif(p_note, ''), 'إيداع رأس مال'), 'transfer', null, jsonb_build_array(
      jsonb_build_object('account', p_to, 'debit', p_amount), jsonb_build_object('account', '3100', 'credit', p_amount)));
  elsif p_kind = 'withdraw' then -- سحب شخصي
    return public._post_entry(current_date, coalesce(nullif(p_note, ''), 'سحب شخصي'), 'transfer', null, jsonb_build_array(
      jsonb_build_object('account', '3200', 'debit', p_amount), jsonb_build_object('account', p_from, 'credit', p_amount)));
  end if;
  raise exception 'نوع حركة غير معروف';
end $$;

-- ───────── الدفعات: سداد مورد / تحصيل من شركة التوصيل ─────────
create or replace function public.record_payment(p_party_type text, p_party_id text, p_amount numeric, p_account text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.suppliers; o record; left_amt numeric;
begin
  perform public.require_finance();
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if not exists (select 1 from public.accounts where code = p_account and is_cash) then raise exception 'اختاري حساب دفع صحيح'; end if;
  if p_party_type = 'supplier' then
    select * into s from public.suppliers where id = p_party_id::uuid;
    if s.id is null then raise exception 'المورد غير موجود'; end if;
    return public._post_entry(current_date, 'سداد للمورد ' || s.name || coalesce(' — ' || nullif(p_note, ''), ''), 'payment', s.id::text, jsonb_build_array(
      jsonb_build_object('account', '2100', 'debit', p_amount, 'party_type', 'supplier', 'party_id', s.id::text, 'party_name', s.name),
      jsonb_build_object('account', p_account, 'credit', p_amount)));
  elsif p_party_type = 'courier' then
    -- نعلّم طلبات الدفع عند الاستلام كمدفوعة بالأقدم أولاً حتى يغطيها المبلغ
    left_amt := p_amount;
    for o in select id, total from public.orders where channel = 'online' and payment_method = 'cod' and status = 'delivered' and not is_paid order by created_at loop
      exit when left_amt < o.total;
      update public.orders set is_paid = true where id = o.id;
      left_amt := left_amt - o.total;
    end loop;
    return public._post_entry(current_date, 'تحصيل من شركة التوصيل' || coalesce(' — ' || nullif(p_note, ''), ''), 'payment', 'courier', jsonb_build_array(
      jsonb_build_object('account', p_account, 'debit', p_amount),
      jsonb_build_object('account', '1130', 'credit', p_amount, 'party_type', 'courier', 'party_name', 'شركة التوصيل')));
  end if;
  raise exception 'جهة غير معروفة';
end $$;

-- ───────── ورديات المحل ─────────
create table public.cash_shifts (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid references public.profiles(id),
  opened_at timestamptz not null default now(),
  opening numeric(14,2) not null default 0,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  expected numeric(14,2),
  counted numeric(14,2),
  note text
);
create unique index one_open_shift on public.cash_shifts ((true)) where closed_at is null;

create or replace function public.shift_summary()
returns table (shift_id uuid, opened_at timestamptz, opened_by_name text, opening numeric, cash_sales numeric, cash_expenses numeric, expected numeric)
language sql stable security definer set search_path = public as $$
  select s.id, s.opened_at, pr.full_name, s.opening,
    coalesce((select sum(total) from public.orders o where o.channel = 'store' and o.payment_method = 'cash' and o.status = 'delivered' and o.created_at >= s.opened_at), 0),
    coalesce((select sum(amount) from public.expenses e where e.paid_from = '1110' and e.created_at >= s.opened_at), 0),
    s.opening
      + coalesce((select sum(total) from public.orders o where o.channel = 'store' and o.payment_method = 'cash' and o.status = 'delivered' and o.created_at >= s.opened_at), 0)
      - coalesce((select sum(amount) from public.expenses e where e.paid_from = '1110' and e.created_at >= s.opened_at), 0)
  from public.cash_shifts s left join public.profiles pr on pr.id = s.opened_by
  where s.closed_at is null and public.is_staff();
$$;

create or replace function public.open_shift(p_opening numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare x uuid;
begin
  perform public.require_staff();
  if exists (select 1 from public.cash_shifts where closed_at is null) then raise exception 'توجد وردية مفتوحة بالفعل'; end if;
  insert into public.cash_shifts (opened_by, opening) values (auth.uid(), greatest(coalesce(p_opening, 0), 0)) returning id into x;
  return x;
end $$;

create or replace function public.close_shift(p_counted numeric, p_note text)
returns numeric language plpgsql security definer set search_path = public as $$
declare sm record; diff numeric;
begin
  perform public.require_staff();
  select * into sm from public.shift_summary();
  if sm.shift_id is null then raise exception 'لا توجد وردية مفتوحة'; end if;
  diff := coalesce(p_counted, 0) - sm.expected;
  update public.cash_shifts set closed_at = now(), closed_by = auth.uid(), expected = sm.expected, counted = p_counted, note = nullif(p_note, '') where id = sm.shift_id;
  if diff > 0 then
    perform public._post_entry(current_date, 'فائض صندوق عند إغلاق الوردية', 'shift', sm.shift_id::text, jsonb_build_array(
      jsonb_build_object('account', '1110', 'debit', diff), jsonb_build_object('account', '4900', 'credit', diff)));
  elsif diff < 0 then
    perform public._post_entry(current_date, 'عجز صندوق عند إغلاق الوردية', 'shift', sm.shift_id::text, jsonb_build_array(
      jsonb_build_object('account', '5900', 'debit', -diff), jsonb_build_object('account', '1110', 'credit', -diff)));
  end if;
  return diff;
end $$;

-- ───────── أرصدة ومجاميع الفترات ─────────
create or replace function public.account_totals(p_from date default null, p_to date default null)
returns table (code text, name text, type public.account_type, debit numeric, credit numeric)
language sql stable security definer set search_path = public as $$
  select a.code, a.name, a.type, coalesce(sum(l.debit), 0), coalesce(sum(l.credit), 0)
  from public.accounts a
  left join public.journal_lines l on l.account_code = a.code
  left join public.journal_entries e on e.id = l.entry_id
  where public.is_finance()
    and (l.id is null or ((p_from is null or e.entry_date >= p_from) and (p_to is null or e.entry_date <= p_to)))
  group by a.code, a.name, a.type
  order by a.code;
$$;

-- ───────── الإعدادات المالية ─────────
create table public.finance_settings (
  id integer primary key default 1 check (id = 1),
  currency text not null default 'SYP',
  fiscal_start_month integer not null default 1,
  inventory_method text not null default 'avg',
  close_period text not null default 'monthly',
  tax_rate numeric(5,2) not null default 0,
  tax_number text,
  prices_include_tax boolean not null default true,
  store_address text,
  store_phone text,
  invoice_footer text default 'شكراً لتسوّقك من شغلات بنات',
  updated_at timestamptz not null default now()
);
insert into public.finance_settings (id) values (1);

-- ───────── طلبات الإرجاع والاستبدال ─────────
create sequence public.return_number_seq start 3001;
create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('RT-' || nextval('public.return_number_seq')),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id),
  order_item_id bigint references public.order_items(id),
  kind text not null check (kind in ('return', 'exchange')),
  reason text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'done')),
  staff_note text,
  created_at timestamptz not null default now()
);

-- ───────── RLS ─────────
alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.expenses enable row level security;
alter table public.cash_shifts enable row level security;
alter table public.finance_settings enable row level security;
alter table public.return_requests enable row level security;

create policy "accounts read staff" on public.accounts for select using (public.is_staff());
create policy "accounts finance write" on public.accounts for insert with check (public.is_finance());
create policy "accounts finance update" on public.accounts for update using (public.is_finance()) with check (public.is_finance());
create policy "journal finance read" on public.journal_entries for select using (public.is_finance());
create policy "journal lines finance read" on public.journal_lines for select using (public.is_finance());
create policy "expenses finance read" on public.expenses for select using (public.is_finance());
create policy "shifts staff read" on public.cash_shifts for select using (public.is_staff());
create policy "settings read staff" on public.finance_settings for select using (public.is_staff());
create policy "settings finance write" on public.finance_settings for update using (public.is_finance()) with check (public.is_finance());
create policy "returns own read" on public.return_requests for select using (user_id = auth.uid() or public.is_staff());
create policy "returns own insert" on public.return_requests for insert with check (
  user_id = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'delivered'));
create policy "returns staff update" on public.return_requests for update using (public.is_staff()) with check (public.is_staff());

-- إيصالات المصاريف (تخزين خاص)
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false) on conflict (id) do nothing;
create policy "receipts finance read" on storage.objects for select using (bucket_id = 'receipts' and public.is_finance());
create policy "receipts finance write" on storage.objects for insert with check (bucket_id = 'receipts' and public.is_finance());

-- ───────── صلاحيات الدوال ─────────
revoke execute on function public._post_entry(date, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public._post_order(uuid, boolean) from public, anon, authenticated;
revoke execute on function public._orders_accounting() from public, anon, authenticated;
revoke execute on function public._po_accounting() from public, anon, authenticated;
revoke execute on function public.is_finance() from public, anon;
revoke execute on function public.require_finance() from public, anon;
revoke execute on function public.record_expense(date, text, text, numeric, text, boolean, text) from public, anon;
revoke execute on function public.post_manual_entry(date, text, jsonb) from public, anon;
revoke execute on function public.cash_move(text, numeric, text, text, text) from public, anon;
revoke execute on function public.record_payment(text, text, numeric, text, text) from public, anon;
revoke execute on function public.shift_summary() from public, anon;
revoke execute on function public.open_shift(numeric) from public, anon;
revoke execute on function public.close_shift(numeric, text) from public, anon;
revoke execute on function public.account_totals(date, date) from public, anon;
grant execute on function public.is_finance(), public.require_finance(), public.shift_summary(), public.account_totals(date, date),
  public.record_expense(date, text, text, numeric, text, boolean, text), public.post_manual_entry(date, text, jsonb),
  public.cash_move(text, numeric, text, text, text), public.record_payment(text, text, numeric, text, text),
  public.open_shift(numeric), public.close_shift(numeric, text) to authenticated;

-- ترحيل الطلبات المسلّمة والمرتجعة السابقة
do $$ declare r record; begin
  for r in select id, status from public.orders where status in ('delivered', 'returned') order by created_at loop
    perform public._post_order(r.id, false);
    if r.status = 'returned' then perform public._post_order(r.id, true); end if;
  end loop;
end $$;
