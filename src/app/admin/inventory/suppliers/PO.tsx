"use client";
import { useState, useTransition } from "react";
import { createPurchaseOrder, receivePurchaseOrder, type ActionResult } from "../../actions";
import { price } from "@/lib/format";

type Opt = { id: string; name: string };

export function ReceiveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <button className="btn secondary" style={{ minHeight: 36, padding: "0 14px" }} disabled={pending}
        onClick={() => start(async () => { const r = await receivePurchaseOrder(id); if (!r.ok) setErr(r.message); })}>{pending ? "…" : "استلام"}</button>
      {err && <span className="caption" style={{ color: "var(--magenta)" }}>{err}</span>}
    </span>
  );
}

export function NewPO({ suppliers, locations, variants }: { suppliers: Opt[]; locations: Opt[]; variants: { id: string; label: string }[] }) {
  const [sup, setSup] = useState(suppliers[0]?.id ?? "");
  const [loc, setLoc] = useState(locations.find((l) => /مستودع/.test(l.name))?.id ?? locations[0]?.id ?? "");
  const [items, setItems] = useState<{ variantId: string; qty: number; cost: number }[]>([{ variantId: variants[0]?.id ?? "", qty: 1, cost: 0 }]);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const total = items.reduce((s, i) => s + i.qty * i.cost, 0);
  const upd = (i: number, p: Partial<(typeof items)[number]>) => setItems((x) => x.map((it, j) => (j === i ? { ...it, ...p } : it)));

  return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 className="adm-h2">أمر شراء جديد</h2>
      <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        <label className="a-field">المورد<select className="a-in" value={sup} onChange={(e) => setSup(e.target.value)}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="a-field">يُستلم في<select className="a-in" value={loc} onChange={(e) => setLoc(e.target.value)}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,3fr) minmax(0,1fr) minmax(0,1fr) auto", gap: 8, alignItems: "end" }}>
          <label className="a-field">المنتج<select className="a-in" value={it.variantId} onChange={(e) => upd(i, { variantId: e.target.value })}>{variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
          <label className="a-field">الكمية<input className="a-in" type="number" min="1" value={it.qty} onChange={(e) => upd(i, { qty: Math.max(1, Number(e.target.value)) })} /></label>
          <label className="a-field">تكلفة القطعة<input className="a-in" type="number" min="0" value={it.cost} onChange={(e) => upd(i, { cost: Math.max(0, Number(e.target.value)) })} /></label>
          <button type="button" className="btn soft" aria-label="حذف السطر" disabled={items.length === 1} onClick={() => setItems((x) => x.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn soft" style={{ alignSelf: "flex-start" }} onClick={() => setItems((x) => [...x, { variantId: variants[0]?.id ?? "", qty: 1, cost: 0 }])}>+ سطر آخر</button>
      <label className="a-field">ملاحظة<input className="a-in" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="row-between"><span className="adm-sub">الإجمالي</span><b>{price(total)}</b></div>
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
      <button className="btn" style={{ alignSelf: "flex-start", minWidth: 160 }} disabled={pending || !sup || !loc}
        onClick={() => start(async () => { const r = await createPurchaseOrder(sup, loc, items, note); setMsg(r); if (r.ok) { setItems([{ variantId: variants[0]?.id ?? "", qty: 1, cost: 0 }]); setNote(""); } })}>
        {pending ? "جارٍ الإنشاء…" : "إنشاء أمر الشراء"}
      </button>
    </div>
  );
}
