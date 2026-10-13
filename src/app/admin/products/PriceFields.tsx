"use client";
import { useState } from "react";

const r10 = (n: number) => Math.max(0, Math.round(n / 10) * 10);
const fmt = (n: number) => n.toLocaleString("en-US");

/** التسعير بالليرة أو بالدولار — العرض في المتجر دائماً بالليرة مقرّباً لأقرب 10 */
export function PriceFields({ rate, p }: {
  rate: number;
  p: { currency?: string; price?: number; compare_at_price?: number | null; cost?: number | null; price_usd?: number | null; compare_usd?: number | null; cost_usd?: number | null };
}) {
  const [cur, setCur] = useState<"SYP" | "USD">(p.currency === "USD" ? "USD" : "SYP");
  const [usd, setUsd] = useState({ price: p.price_usd ?? "", compare: p.compare_usd ?? "", cost: p.cost_usd ?? "" } as Record<string, number | string>);
  const syp = (v: number | string) => (v === "" || v == null ? null : r10(Number(v) * rate));
  const chip = (on: boolean) => ({ className: `a-chip${on ? " on" : ""}`, style: { flex: 1 } as React.CSSProperties });

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

      {cur === "SYP" ? (
        <div className="a-grid">
          <label className="a-field">السعر (ل.س)<input name="price" type="number" min="0" step="10" className="a-in" defaultValue={p.currency === "USD" ? "" : p.price ?? ""} required /></label>
          <label className="a-field">السعر قبل الخصم (ل.س)<input name="compare_at_price" type="number" min="0" step="10" className="a-in" defaultValue={p.currency === "USD" ? "" : p.compare_at_price ?? ""} placeholder="اختياري" /></label>
          <label className="a-field">سعر التكلفة (ل.س)<input name="cost" type="number" min="0" step="any" className="a-in" defaultValue={p.currency === "USD" ? "" : p.cost ?? ""} placeholder="للمحاسبة" /></label>
        </div>
      ) : (
        <div className="a-grid">
          {([["price", "السعر ($)", true], ["compare", "السعر قبل الخصم ($)", false], ["cost", "سعر التكلفة ($)", false]] as const).map(([k, label, req]) => (
            <label key={k} className="a-field">{label}
              <input name={`${k}_usd`} type="number" min="0" step="0.01" className="a-in ltr" required={req} value={usd[k]} placeholder={req ? "" : "اختياري"}
                onChange={(e) => setUsd((x) => ({ ...x, [k]: e.target.value }))} />
              {syp(usd[k]) != null && <span className="caption">{k === "cost" ? "≈ " + fmt(Math.round(Number(usd[k]) * rate)) : "= " + fmt(syp(usd[k])!)} ل.س{k !== "cost" ? " في المتجر" : ""}</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
