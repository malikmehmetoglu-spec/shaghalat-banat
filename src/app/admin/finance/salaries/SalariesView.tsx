"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { paySalary, saveSalary } from "../actions";
import { PlacePicker } from "../_ui/PlacePicker";
import { Sheet } from "../_ui/Sheet";
import { PLACE_NAME } from "@/lib/money";

export type Salary = {
  id: string; name: string; amount: number; currency: "SYP" | "USD"; payDay: number; active: boolean;
  paidThisMonth: { amount: number; at: string; from: string } | null; daysLeft: number;
  history: { period: string; amount: number; from: string }[];
};
const n = (v: number) => Math.round(v).toLocaleString("en-US");
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const periodName = (p: string) => `${MONTHS[Number(p.slice(5)) - 1]} ${p.slice(0, 4)}`;
const money = (v: number, c: string) => (c === "USD" ? `${n(v)}$` : `${n(v)} ل.س`);

export function SalariesView({ salaries, period, sham, shop, rate }: { salaries: Salary[]; period: string; sham: number; shop: number; rate: number }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Salary | "new" | null>(null);
  const [pay, setPay] = useState<Salary | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const done = (r: { ok: boolean; message: string }) => { setToast(r); setTimeout(() => setToast(null), 3500); if (r.ok) { setEdit(null); setPay(null); router.refresh(); } };
  const active = salaries.filter((s) => s.active);
  const monthTotal = active.reduce((s, x) => s + (x.currency === "USD" ? x.amount * rate : x.amount), 0);
  const paidCount = active.filter((s) => s.paidThisMonth).length;
  const monthLabel = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"][Number(period.slice(5)) - 1];

  return (
    <div className="fin">
      <header className="fin-head">
        <div className="title-block"><h1 className="adm-h1">الرواتب</h1><span className="adm-sub">رواتب شهرية ثابتة · يصلك تنبيه قبل موعد كل راتب بثلاثة أيام</span></div>
        <button type="button" className="fin-btn" onClick={() => setEdit("new")}><Icon name="plus" size={18} stroke={2.4} /> إضافة موظفة</button>
      </header>

      <div className="fin-totals">
        <div><span>رواتب {monthLabel}</span><b className="num">{n(monthTotal)} ل.س</b></div>
        <div><span>دُفع</span><b className="num fin-c-in">{paidCount} من {active.length}</b></div>
        <div><span>بقي</span><b className="num fin-c-out">{active.length - paidCount}</b></div>
      </div>

      {!salaries.length && (
        <div className="fin-empty big">
          <span className="fin-empty-ic"><Icon name="user" size={28} stroke={1.8} /></span>
          <b>أضيفي أول موظفة</b><span>اكتبي الاسم والراتب الشهري ويوم الدفع، وسيذكّرك النظام قبل كل موعد.</span>
          <button type="button" className="fin-btn" onClick={() => setEdit("new")}>إضافة موظفة</button>
        </div>
      )}

      <div className="fin-cards">
        {salaries.map((s) => {
          const st = !s.active ? "off" : s.paidThisMonth ? "paid" : s.daysLeft < 0 ? "late" : s.daysLeft <= 3 ? "soon" : "wait";
          const stLabel = { off: "موقوف", paid: "دُفع هذا الشهر", late: `متأخر ${-s.daysLeft} ${-s.daysLeft === 1 ? "يوم" : "أيام"}`, soon: s.daysLeft === 0 ? "مستحق اليوم" : `بعد ${s.daysLeft} ${s.daysLeft === 1 ? "يوم" : "أيام"}`, wait: `يوم ${s.payDay} من الشهر` }[st];
          return (
            <article key={s.id} className={`fin-emp fin-st-${st}`}>
              <div className="fin-emp-top">
                <span className="fin-avatar">{s.name.trim()[0]}</span>
                <div className="fin-emp-t"><b>{s.name}</b><span className={`fin-pill fin-pill-${st}`}>{stLabel}</span></div>
                <button type="button" className="fin-icon-btn" aria-label={`تعديل ${s.name}`} onClick={() => setEdit(s)}><Icon name="edit" size={16} stroke={2} /></button>
              </div>
              <div className="fin-emp-amt"><span>الراتب الشهري</span><b className="num">{money(s.amount, s.currency)}</b>{s.currency === "USD" && rate > 0 && <em className="num">≈ {n(s.amount * rate)} ل.س</em>}</div>
              {s.paidThisMonth
                ? <div className="fin-emp-paid"><Icon name="check" size={16} stroke={2.4} /> دُفع <span className="num">{n(s.paidThisMonth.amount)} ل.س</span> من {PLACE_NAME[s.paidThisMonth.from]}</div>
                : s.active && <button type="button" className={`fin-submit fin-t-${st === "late" || st === "soon" ? "out" : "brand"}`} onClick={() => setPay(s)}>دفع راتب {monthLabel}</button>}
              {s.history.length > 0 && (
                <details className="fin-emp-hist">
                  <summary>سجل الدفعات</summary>
                  {s.history.map((h) => <div key={h.period} className="kv"><span>{periodName(h.period)}</span><span className="num">{n(h.amount)} ل.س · {PLACE_NAME[h.from]}</span></div>)}
                </details>
              )}
            </article>
          );
        })}
      </div>

      {edit && <EditSalary s={edit === "new" ? null : edit} onClose={() => setEdit(null)} onDone={done} />}
      {pay && <PaySalary s={pay} period={period} monthLabel={monthLabel} sham={sham} shop={shop} rate={rate} onClose={() => setPay(null)} onDone={done} />}
      {toast && <div className={`ob-toast ${toast.ok ? "ok" : "bad"}`} role="status">{toast.message}</div>}
    </div>
  );
}

function EditSalary({ s, onClose, onDone }: { s: Salary | null; onClose: () => void; onDone: (r: { ok: boolean; message: string }) => void }) {
  const [name, setName] = useState(s?.name ?? "");
  const [amount, setAmount] = useState(s ? String(s.amount) : "");
  const [currency, setCurrency] = useState<"SYP" | "USD">(s?.currency ?? "SYP");
  const [day, setDay] = useState(String(s?.payDay ?? 1));
  const [active, setActive] = useState(s?.active ?? true);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <Sheet title={s ? `تعديل ${s.name}` : "إضافة موظفة"} sub="الراتب الشهري الثابت وموعده" onClose={onClose}>
      <form className="fin-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveSalary({ id: s?.id, name, amount: Number(amount), currency, payDay: Number(day), active }); if (!r.ok) setErr(r.message); else onDone(r); }); }}>
        <label className="fin-field"><span className="fin-label">الاسم</span><input className="fin-in" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <div className="fin-field">
          <span className="fin-label">الراتب الشهري</span>
          <div className="fin-amount-box">
            <input inputMode="decimal" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" aria-label="الراتب" />
            <div className="fin-cur" role="radiogroup" aria-label="العملة">{(["SYP", "USD"] as const).map((c) => <button key={c} type="button" role="radio" aria-checked={currency === c} className={currency === c ? "on" : ""} onClick={() => setCurrency(c)}>{c === "SYP" ? "ل.س" : "$"}</button>)}</div>
          </div>
          {currency === "USD" && <span className="fin-hint">يُحوَّل لليرة بسعر الصرف يوم الدفع.</span>}
        </div>
        <div className="fin-field">
          <span className="fin-label">يوم الدفع من كل شهر</span>
          <div className="fin-days-pick">{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <button key={d} type="button" className={`num${Number(day) === d ? " on" : ""}`} onClick={() => setDay(String(d))}>{d}</button>)}</div>
        </div>
        {s && <label className="fin-check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> الراتب فعّال (أزيلي العلامة لإيقافه إن تركت العمل)</label>}
        {err && <span className="a-flash tone-danger">{err}</span>}
        <button className="fin-submit fin-t-brand" disabled={pending}>{pending ? "جارٍ الحفظ…" : "حفظ"}</button>
      </form>
    </Sheet>
  );
}

function PaySalary({ s, period, monthLabel, sham, shop, rate, onClose, onDone }: { s: Salary; period: string; monthLabel: string; sham: number; shop: number; rate: number; onClose: () => void; onDone: (r: { ok: boolean; message: string }) => void }) {
  const [from, setFrom] = useState("1110");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const syp = s.currency === "USD" ? s.amount * rate : s.amount;
  return (
    <Sheet title={`راتب ${s.name}`} sub={`شهر ${monthLabel}`} tone="out" onClose={onClose}>
      <form className="fin-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await paySalary({ id: s.id, period, from, note }); if (!r.ok) setErr(r.message); else onDone(r); }); }}>
        <div className="fin-big-amt"><span>المبلغ</span><b className="num">{money(s.amount, s.currency)}</b>{s.currency === "USD" && <em className="num">{rate > 0 ? `≈ ${n(syp)} ل.س` : "سعر الدولار غير محدد"}</em>}</div>
        <PlacePicker label="يُدفع من" places={[{ code: "1120", name: "شام كاش", balance: sham }, { code: "1110", name: "صندوق المحل", balance: shop }, { code: "3100", name: "المال الخاص", balance: null }]} value={from} onChange={setFrom} />
        <label className="fin-field"><span className="fin-label">ملاحظة (اختياري)</span><input className="fin-in" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        {err && <span className="a-flash tone-danger">{err}</span>}
        <button className="fin-submit fin-t-out" disabled={pending}>{pending ? "جارٍ التسجيل…" : "تأكيد دفع الراتب"}</button>
      </form>
    </Sheet>
  );
}
