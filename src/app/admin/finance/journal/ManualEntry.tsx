"use client";
import { useState, useTransition } from "react";
import { postManualEntry } from "../actions";
import { price } from "@/lib/format";

type Line = { account: string; debit: string; credit: string };
const blank = (account = ""): Line => ({ account, debit: "", credit: "" });

export function ManualEntry({ accounts }: { accounts: { code: string; name: string }[] }) {
  const [d, setD] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<Line[]>([blank("1110"), blank("3100")]);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const dr = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const cr = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = dr > 0 && Math.abs(dr - cr) < 0.005;
  const upd = (i: number, p: Partial<Line>) => setLines((x) => x.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="adm-h2">قيد يدوي جديد</h2>
      <div className="a-grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)" }}>
        <label className="a-field">التاريخ<input type="date" className="a-in" value={d} onChange={(e) => setD(e.target.value)} /></label>
        <label className="a-field">البيان<input className="a-in" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="رأس مال افتتاحي" /></label>
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto", gap: 6, alignItems: "end" }}>
          <label className="a-field">{i === 0 ? "الحساب" : <span className="sr">الحساب</span>}
            <select className="a-in" value={l.account} onChange={(e) => upd(i, { account: e.target.value })}>
              <option value="">اختاري…</option>
              {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
            </select>
          </label>
          <label className="a-field">{i === 0 ? "مدين" : <span className="sr">مدين</span>}<input className="a-in" type="number" min="0" value={l.debit} onChange={(e) => upd(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })} /></label>
          <label className="a-field">{i === 0 ? "دائن" : <span className="sr">دائن</span>}<input className="a-in" type="number" min="0" value={l.credit} onChange={(e) => upd(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })} /></label>
          <button type="button" className="btn soft" aria-label="حذف السطر" disabled={lines.length <= 2} onClick={() => setLines((x) => x.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn soft" style={{ alignSelf: "flex-start" }} onClick={() => setLines((x) => [...x, blank()])}>+ سطر</button>
      <div className="kv" style={{ fontSize: 13 }}><span className="adm-sub">الإجمالي</span><span>مدين {price(dr)} · دائن {price(cr)}</span></div>
      <span className={`a-flash ${balanced ? "tone-success" : "tone-warning"}`}>{balanced ? "القيد متوازن" : "القيد غير متوازن بعد"}</span>
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
      <button className="btn" disabled={!balanced || !memo.trim() || pending} onClick={() => start(async () => {
        const r = await postManualEntry(d, memo, lines.map((l) => ({ account: l.account, debit: Number(l.debit || 0), credit: Number(l.credit || 0) })));
        setMsg(r); if (r.ok) { setMemo(""); setLines([blank("1110"), blank("3100")]); }
      })}>{pending ? "جارٍ الحفظ…" : "حفظ القيد"}</button>
    </div>
  );
}
