"use client";
import { useState } from "react";

const r10 = (n: number) => Math.max(0, Math.round(n / 10) * 10);
const rUsd = (n: number) => Math.max(0, Math.round(n * 2) / 2); // الدولار: لأقرب نصف دولار
const fmt = (n: number) => n.toLocaleString("en-US");
export const MARKUP = 0.60;   // ربح 60% فوق سعر التكلفة
export const COMPARE = 0.30;  // «قبل الخصم» أعلى من سعر البيع بـ 30%

/**
 * التسعير: تكتب صاحبة المتجر سعر التكلفة فقط، فيُقترح سعر البيع (+60%) والسعر قبل الخصم (+30% فوق البيع)
 * مقرّبين (لأقرب 10 ل.س، أو لأقرب نصف دولار). يمكن تعديل المقترح يدوياً.
 */
export function PriceFields({ rate, p }: {
  rate: number;
  p: { currency?: string; price?: number; compare_at_price?: number | null; cost?: number | null; price_usd?: number | null; compare_usd?: number | null; cost_usd?: number | null };
}) {
  const isUsd = p.currency === "USD";
  const [cur, setCur] = useState<"SYP" | "USD">(isUsd ? "USD" : "SYP");
  const init = (v: number | null | undefined) => (v != null && Number(v) > 0 ? String(v) : "");
  const [vals, setVals] = useState({
    SYP: { cost: isUsd ? "" : init(p.cost), price: isUsd ? "" : init(p.price), compare: isUsd ? "" : init(p.compare_at_price) },
    USD: { cost: init(p.cost_usd), price: init(p.price_usd), compare: init(p.compare_usd) },
  });
  // الحقول التي عدّلتها يدوياً لا يُعاد اقتراحها
  const [manual, setManual] = useState<{ price: boolean; compare: boolean }>({ price: !!(isUsd ? p.price_usd : Number(p.price) > 0), compare: !!(isUsd ? p.compare_usd : p.compare_at_price) });
  const v = vals[cur];
  const round = cur === "USD" ? rUsd : r10;
  const suggest = (cost: string) => {
    const c = Number(cost);
    if (!cost || !(c > 0)) return null;
    const price = round(c * (1 + MARKUP));
    return { price, compare: round(price * (1 + COMPARE)) };
  };
  const sug = suggest(v.cost);

  function setCost(cost: string) {
    const s = suggest(cost);
    setVals((x) => ({ ...x, [cur]: { cost, price: !manual.price && s ? String(s.price) : x[cur].price, compare: !manual.compare && s ? String(s.compare) : x[cur].compare } }));
  }
  function setField(k: "price" | "compare", val: string) {
    setManual((m) => ({ ...m, [k]: val !== "" }));
    setVals((x) => ({ ...x, [cur]: { ...x[cur], [k]: val } }));
  }
  function applySuggest() {
    if (!sug) return;
    setManual({ price: false, compare: false });
    setVals((x) => ({ ...x, [cur]: { ...x[cur], price: String(sug.price), compare: String(sug.compare) } }));
  }

  const chip = (on: boolean) => ({ className: `a-chip${on ? " on" : ""}`, style: { flex: 1 } as React.CSSProperties });
  const unit = cur === "USD" ? "$" : "ل.س";
  const n = (k: "cost" | "price" | "compare") => (cur === "USD" ? (k === "compare" ? "compare_usd" : `${k}_usd`) : k === "compare" ? "compare_at_price" : k);
  const sypOf = (val: string) => (val && cur === "USD" ? `= ${fmt(r10(Number(val) * rate))} ل.س في المتجر` : null);
  const profit = Number(v.price) > 0 && Number(v.cost) > 0 ? Math.round(((Number(v.price) - Number(v.cost)) / Number(v.cost)) * 100) : null;
  const differs = sug && (Number(v.price) !== sug.price || Number(v.compare) !== sug.compare);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="currency" value={cur} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>عملة التسعير</span>
        <div style={{ display: "flex", gap: 8, maxWidth: 360 }}>
          <button type="button" {...chip(cur === "SYP")} onClick={() => setCur("SYP")}>ليرة سورية</button>
          <button type="button" {...chip(cur === "USD")} onClick={() => setCur("USD")}>دولار $</button>
        </div>
        {cur === "USD" && <span className="caption">سعر الدولار الحالي: <b className="ltr">{fmt(rate)}</b> ل.س — يتحدّث السعر بالليرة تلقائياً مع كل تغيّر في سعر الصرف</span>}
      </div>

      <div className="a-grid">
        <label className="a-field">سعر التكلفة ({unit})
          <input name={n("cost")} type="number" min="0" step="any" className="a-in ltr" value={v.cost} onChange={(e) => setCost(e.target.value)} placeholder="اكتبي سعر التكلفة أولاً" required />
          {cur === "USD" && v.cost && <span className="caption">≈ {fmt(Math.round(Number(v.cost) * rate))} ل.س</span>}
        </label>
        <label className="a-field">سعر البيع ({unit})
          <input name={n("price")} type="number" min="0" step="any" className="a-in ltr" value={v.price} onChange={(e) => setField("price", e.target.value)} required />
          <span className="caption">{sypOf(v.price) ?? (sug ? `المقترح: ${fmt(sug.price)} (ربح 60%)` : "يُقترح تلقائياً من التكلفة")}{profit != null && <> · ربح <b style={{ color: profit < 40 ? "var(--danger-fg)" : "var(--success-fg)" }}>{profit}%</b></>}</span>
        </label>
        <label className="a-field">السعر قبل الخصم ({unit})
          <input name={n("compare")} type="number" min="0" step="any" className="a-in ltr" value={v.compare} onChange={(e) => setField("compare", e.target.value)} placeholder="اختياري" />
          <span className="caption">{sypOf(v.compare) ?? (sug ? `المقترح: ${fmt(sug.compare)} (+30%)` : "يظهر مشطوباً بجانب السعر")}</span>
        </label>
      </div>
      {differs && <button type="button" className="btn soft" style={{ alignSelf: "flex-start" }} onClick={applySuggest}>تطبيق الأسعار المقترحة ({fmt(sug!.price)} / {fmt(sug!.compare)} {unit})</button>}
    </div>
  );
}
