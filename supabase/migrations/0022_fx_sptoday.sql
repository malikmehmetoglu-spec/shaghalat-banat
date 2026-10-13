-- مصدر سعر الدولار: موقع «الليرة اليوم» (sp-today.com) — سعر المبيع في دمشق، بالليرة الجديدة
-- احتياطي: open.er-api.com إن تعذّر الوصول للموقع
alter table public.fx_settings add column if not exists city text not null default 'damascus';

create or replace function private.fx_sptoday()
returns numeric language plpgsql security definer set search_path = public, extensions as $$
declare res extensions.http_response; body text; m text[]; city text;
begin
  select coalesce(f.city, 'damascus') into city from public.fx_settings f where id = 1;
  select * into res from extensions.http((
    'GET', 'https://sp-today.com/en/currency/us_dollar',
    array[extensions.http_header('User-Agent', 'Mozilla/5.0 (ShaghalatBanat FX)')], null, null)::extensions.http_request);
  if res.status <> 200 then raise exception 'sp-today: HTTP %', res.status; end if;
  body := replace(res.content, '\"', '"');
  m := regexp_match(body, '"symbol":"USD"[^\]]*?"' || city || '":\{"buy":([0-9.]+),"sell":([0-9.]+),"change"');
  if m is null then raise exception 'sp-today: لم يُعثر على سعر الدولار'; end if;
  return (m[2])::numeric / 100;   -- سعر المبيع بالليرة القديمة ← الجديدة (حذف صفرين)
end $$;

create or replace function private.fx_refresh()
returns numeric language plpgsql security definer set search_path = public, extensions as $$
declare r numeric; src text := 'الليرة اليوم (sp-today.com)'; err text;
begin
  begin
    r := private.fx_sptoday();
  exception when others then
    err := sqlerrm;
    begin
      select ((content)::jsonb -> 'rates' ->> 'SYP')::numeric into r from extensions.http_get('https://open.er-api.com/v6/latest/USD');
      if r > 1000 then r := r / 100; end if;
      src := 'open.er-api.com (احتياطي — تعذّر الوصول لـ الليرة اليوم)';
    exception when others then
      update public.fx_settings set last_error = coalesce(err, sqlerrm), updated_at = now() where id = 1;
      return null;
    end;
  end;
  if r is null or r <= 0 then
    update public.fx_settings set last_error = 'سعر غير صالح', updated_at = now() where id = 1;
    return null;
  end if;
  perform private.apply_fx(round(r, 4), src);
  return r;
end $$;
