"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { payConsignor, saveConsignor } from "../actions";
import { AmountField } from "../_ui/AmountField";
import { PlacePicker } from "../_ui/PlacePicker";
import { Sheet } from "../_ui/Sheet";

export type Trader = {
  id: string; name: string; phone: string | null; mode: "percent" | "net"; pct: number; note: string | null; active: boolean;
  due: number; products: number; stock: number; monthSales: number; monthShare: number;
  recent: { name: string; qty: number; total: number; share: number; number: string; at: string }[];
};
const n = (v: number) => Math.round(v).toLocaleString("en-US");

export function ConsignView({ traders, sham, shop, rate }: { traders: Trader[]; sham: number; shop: number; rate: number }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Trader | "new" | null>(null);
  const [pay, setPay] = useState<Trader | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const done = (r: { ok: boolean; message: string }) => { setToast(r); setTimeout(() => setToast(null), 3500); if (r.ok) { setEdit(null); setPay(null); router.refresh(); } };
  const totalDue = traders.reduce((s, t) => s + t.due, 0);
  return (
    <div className="fin">
      <header className="fin-head">
        <div className="title-block"><h1 className="adm-h1">تجار الأمانة</h1><span className="adm-sub">بضائع التجار تُباع لديك مقابل نسبة · المستحق يُحسب تلقائياً مع كل بيعة</span></div>
        <button type="button" className="fin-btn" onClick={() => setEdit("new")}><Icon name="plus" size={18} stroke={2.4} /> إضافة تاجر</button>
      </header>
      <div className="fin-totals">
        <div><span>مستحق لكل التجار</span><b className="num fin-c-out">{n(totalDue)} ل.س</b></div>
        <div><span>عدد التجار</span><b className="num">{traders.filter((t) => t.active).length}</b></div>
        <div><span>قطع أمانة في المخزون</span><b className="num">{traders.reduce((s, t) => s + t.stock, 0)}</b></div>
      </div>
      <p className="fin-note"><Icon name="info" size={16} stroke={2} /> لتحديد أن منتجاً بضاعة أمانة: من صفحة المنتج اختر «مالك البضاعة». الخصومات يتحمّلها المتجر، وحصة التاجر تُحسب على سعر البيع.</p>

      {!traders.length && (
        <div className="fin-empty big">
          <span className="fin-empty-ic"><Icon name="boxes" size={28} stroke={1.8} /></span>
          <b>لا يوجد تجار أمانة بعد</b><span>أضيفي التاجر ونسبة المتجر، ثم اربطي منتجاته به من صفحة كل منتج.</span>
          <button type="button" className="fin-btn" onClick={() => setEdit("new")}>إضافة تاجر</button>
        </div>
      )}

      <div className="fin-cards">
        {traders.map((t) => (
          <article key={t.id} className={`fin-emp${t.active ? "" : " fin-emp-off"}`}>
            <div className="fin-emp-top">
              <span className="fin-avatar alt">{t.name.trim()[0]}</span>
              <div className="fin-emp-t"><b>{t.name}</b><span className="fin-pill fin-pill-wait">{t.mode === "percent" ? <>للمتجر <span className="num">{t.pct}%</span> من سعر البيع</> : "سعر صافٍ للتاجر لكل قطعة"}</span></div>
              <button type="button" className="fin-icon-btn" aria-label={`تعديل ${t.name}`} onClick={() => setEdit(t)}><Icon name="edit" size={16} stroke={2} /></button>
            </div>
            <div className="fin-emp-amt"><span>المستحق له الآن</span><b className={`num ${t.due > 0 ? "fin-c-out" : ""}`}>{n(t.due)} ل.س</b></div>
            <div className="fin-stats">
              <div><span>مبيعات الشهر</span><b className="num">{n(t.monthSales)}</b></div>
              <div><span>حصته منها</span><b className="num">{n(t.monthShare)}</b></div>
              <div><span>منتجاته</span><b className="num">{t.products}</b></div>
              <div><span>في المخزون</span><b className="num">{t.stock}</b></div>
            </div>
            {t.due > 0 && <button type="button" className="fin-submit fin-t-out" onClick={() => setPay(t)}>دفع مستحقات {t.name.split(" ")[0]}</button>}
            {t.recent.length > 0 && (
              <details className="fin-emp-hist">
                <summary>كشف المبيعات</summary>
                {t.recent.map((r, i) => (
                  <div key={i} className="kv"><span>{r.name} <span className="num">×{r.qty}</span></span><span className="num">{n(r.share)} ل.س</span></div>
                ))}
              </details>
            )}
            {t.phone && <a className="fin-link" href={`tel:${t.phone}`}><span className="num ltr">{t.phone}</span></a>}
          </article>
        ))}
      </div>

      {edit && <EditTrader t={edit === "new" ? null : edit} onClose={() => setEdit(null)} onDone={done} />}
      {pay && <PayTrader t={pay} sham={sham} shop={shop} rate={rate} onClose={() => setPay(null)} onDone={done} />}
      {toast && <div className={`ob-toast ${toast.ok ? "ok" : "bad"}`} role="status">{toast.message}</div>}
    </div>
  );
}

function EditTrader({ t, onClose, onDone }: { t: Trader | null; onClose: () => void; onDone: (r: { ok: boolean; message: string }) => void }) {
  const [name, setName] = useState(t?.name ?? "");
  const [phone, setPhone] = useState(t?.phone ?? "");
  const [mode, setMode] = useState<"percent" | "net">(t?.mode ?? "percent");
  const [pct, setPct] = useState(String(t?.pct ?? 30));
  const [note, setNote] = useState(t?.note ?? "");
  const [active, setActive] = useState(t?.active ?? true);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const example = 10000, cut = mode === "percent" ? Math.round(example * Number(pct || 0) / 100) : null;
  return (
    <Sheet title={t ? `تعديل ${t.name}` : "إضافة تاجر أمانة"} sub="اتفاق تقسيم المبيعات" onClose={onClose}>
      <form className="fin-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveConsignor({ id: t?.id, name, phone, mode, pct: Number(pct), note, active }); if (!r.ok) setErr(r.message); else onDone(r); }); }}>
        <label className="fin-field"><span className="fin-label">اسم التاجر أو المحل</span><input className="fin-in" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <label className="fin-field"><span className="fin-label">رقم الهاتف</span><input className="fin-in ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxx" /></label>
        <div className="fin-field">
          <span className="fin-label">طريقة الاتفاق</span>
          <div className="fin-seg">
            <button type="button" className={mode === "percent" ? "on" : ""} onClick={() => setMode("percent")}><b>نسبة من سعر البيع</b><span>المتجر يأخذ نسبة ثابتة من كل بيعة</span></button>
            <button type="button" className={mode === "net" ? "on" : ""} onClick={() => setMode("net")}><b>سعر صافٍ للتاجر</b><span>للتاجر مبلغ ثابت عن كل قطعة، والباقي للمتجر</span></button>
          </div>
        </div>
        {mode === "percent" ? (
          <label className="fin-field"><span className="fin-label">نسبة المتجر</span>
            <div className="fin-amount-box"><input type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} aria-label="النسبة" /><span className="fin-cur-fixed">%</span></div>
            <span className="fin-hint num">مثال: قطعة بيعت بـ {n(example)} ← للمتجر {n(cut ?? 0)} وللتاجر {n(example - (cut ?? 0))}</span>
          </label>
        ) : <span className="fin-hint">اكتبي المبلغ المتفق عليه للتاجر في خانة «سعر التكلفة» في صفحة كل منتج من منتجاته.</span>}
        <label className="fin-field"><span className="fin-label">ملاحظات الاتفاق (اختياري)</span><input className="fin-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="التسوية كل أسبوعين" /></label>
        {t && <label className="fin-check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> التاجر فعّال</label>}
        {err && <span className="a-flash tone-danger">{err}</span>}
        <button className="fin-submit fin-t-brand" disabled={pending}>{pending ? "جارٍ الحفظ…" : "حفظ"}</button>
      </form>
    </Sheet>
  );
}

function PayTrader({ t, sham, shop, rate, onClose, onDone }: { t: Trader; sham: number; shop: number; rate: number; onClose: () => void; onDone: (r: { ok: boolean; message: string }) => void }) {
  const [amount, setAmount] = useState(String(Math.round(t.due)));
  const [currency, setCurrency] = useState<"SYP" | "USD">("SYP");
  const [from, setFrom] = useState("1120");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <Sheet title={`دفع مستحقات ${t.name}`} sub={`المستحق الآن ${n(t.due)} ل.س`} tone="out" onClose={onClose}>
      <form className="fin-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await payConsignor({ id: t.id, amount: Number(amount), currency, from, note }); if (!r.ok) setErr(r.message); else onDone(r); }); }}>
        <AmountField value={amount} onChange={setAmount} currency={currency} onCurrency={setCurrency} rate={rate} autoFocus />
        <PlacePicker label="يُدفع من" places={[{ code: "1120", name: "شام كاش", balance: sham }, { code: "1110", name: "صندوق المحل", balance: shop }, { code: "3100", name: "المال الخاص", balance: null }]} value={from} onChange={setFrom} />
        <label className="fin-field"><span className="fin-label">ملاحظة (اختياري)</span><input className="fin-in" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        {err && <span className="a-flash tone-danger">{err}</span>}
        <button className="fin-submit fin-t-out" disabled={pending}>{pending ? "جارٍ التسجيل…" : "تأكيد الدفع"}</button>
      </form>
    </Sheet>
  );
}
