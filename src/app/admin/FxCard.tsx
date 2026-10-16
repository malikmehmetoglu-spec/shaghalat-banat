"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFxRate } from "./actions";
import { date } from "@/lib/format";

export function FxCard({ rate, auto, updatedAt, source, error, canEdit }: { rate: number; auto: boolean; updatedAt: string | null; source: string | null; error: string | null; canEdit: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState(auto);
  const [val, setVal] = useState(String(rate || ""));
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const when = updatedAt ? date(updatedAt, true) : "—";
  const save = (autoMode: boolean) => start(async () => {
    const r = await setFxRate(Number(val), autoMode);
    setMsg(r); if (r.ok) router.refresh();
  });
  const chip = (on: boolean) => ({ className: `a-chip${on ? " on" : ""}`, style: { flex: 1 } as React.CSSProperties });

  return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row-between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 className="adm-h2">سعر الدولار</h2>
          <span className="caption">آخر تحديث {when}{source ? ` · ${source}` : ""}</span>
        </div>
        <b className="ltr" style={{ fontSize: 24, color: "var(--magenta)", lineHeight: 1.3 }}>{rate.toLocaleString("en-US", { maximumFractionDigits: 2 })} <span style={{ fontSize: 14 }}>ل.س</span></b>
      </div>
      <span className="caption" style={{ lineHeight: 1.7 }}>المنتجات المسعّرة بالدولار تُعرض بالليرة السورية الجديدة حسب هذا السعر، مقرّبة لأقرب 10 ليرات.</span>
      {error && <span className="a-flash tone-danger">آخر محاولة تحديث فشلت: {error}</span>}
      {canEdit && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" {...chip(mode)} onClick={() => setMode(true)}>تلقائي من «الليرة اليوم» (كل ساعة)</button>
            <button type="button" {...chip(!mode)} onClick={() => setMode(false)}>يدوي</button>
          </div>
          {mode ? (
            <button type="button" className="btn" disabled={pending} onClick={() => save(true)}>{pending ? "جارٍ الجلب…" : "تحديث السعر الآن"}</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input className="a-in ltr" type="number" min="0" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} aria-label="سعر الدولار بالليرة" style={{ flex: 1 }} />
              <button type="button" className="btn" disabled={pending} onClick={() => save(false)}>{pending ? "…" : "اعتماد"}</button>
            </div>
          )}
        </>
      )}
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
    </div>
  );
}
