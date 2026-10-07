"use client";
import { useState, useTransition } from "react";
import { closeShift, openShift } from "../actions";
import { price } from "@/lib/format";

type Shift = { openedAt: string; by: string | null; opening: number; sales: number; expenses: number; expected: number };

export function ShiftCard({ shift }: { shift: Shift | null }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const [closed, setClosed] = useState<(Shift & { counted: number; diff: number }) | null>(null);
  const time = (s: string) => new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  if (closed) {
    return (
      <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="adm-h2">تقرير إغلاق الوردية</h2>
        <span className="caption">{closed.by || "—"} · {time(closed.openedAt)} – {time(new Date().toISOString())}</span>
        <div className="kv"><span className="adm-sub">رصيد البداية</span><span>{price(closed.opening)}</span></div>
        <div className="kv"><span className="adm-sub">مبيعات نقدية</span><span>{price(closed.sales)}</span></div>
        <div className="kv"><span className="adm-sub">مصاريف من الصندوق</span><span>{price(closed.expenses)}</span></div>
        <div className="kv"><span className="adm-sub">المتوقع</span><span>{price(closed.expected)}</span></div>
        <div className="kv"><span className="adm-sub">المعدود</span><span>{price(closed.counted)}</span></div>
        <div className="kv"><b>الفرق</b><b>{closed.diff === 0 ? "مطابق" : price(closed.diff)}</b></div>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => window.print()}>طباعة</button>
          <button className="btn soft" style={{ flex: 1 }} onClick={() => setClosed(null)}>تم</button>
        </div>
      </div>
    );
  }
  if (!shift) {
    return (
      <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="adm-h2">وردية المحل</h2>
        <span className="caption">لا توجد وردية مفتوحة. افتحي وردية بالمبلغ الموجود في الدرج.</span>
        <label className="a-field">رصيد بداية الوردية (ل.س)<input className="a-in" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
        <button className="btn" disabled={pending} onClick={() => start(async () => { setMsg(await openShift(Number(amount || 0))); setAmount(""); })}>فتح وردية</button>
      </div>
    );
  }
  const counted = Number(amount || 0);
  const diff = amount === "" ? null : counted - shift.expected;
  return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 className="adm-h2">إغلاق وردية المحل</h2>
      <span className="caption">الوردية الحالية: {shift.by || "—"} · منذ {time(shift.openedAt)}</span>
      <div className="kv"><span className="adm-sub">رصيد بداية الوردية</span><span>{price(shift.opening)}</span></div>
      <div className="kv"><span className="adm-sub">مبيعات نقدية</span><span style={{ color: "#1a7f4b" }}>+ {price(shift.sales)}</span></div>
      <div className="kv"><span className="adm-sub">مصاريف من الصندوق</span><span style={{ color: "var(--magenta)" }}>- {price(shift.expenses)}</span></div>
      <div className="kv" style={{ borderTop: "1px solid var(--border-row)", paddingTop: 10 }}><b>المتوقع في الدرج</b><b>{price(shift.expected)}</b></div>
      <label className="a-field">المبلغ المعدود فعلياً<input className="a-in" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      {diff !== null && <span className={`a-flash ${diff === 0 ? "tone-success" : "tone-warning"}`}>{diff === 0 ? "مطابق" : diff > 0 ? `فائض ${price(diff)}` : `عجز ${price(-diff)}`}</span>}
      <label className="a-field">ملاحظة<input className="a-in" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
      <button className="btn" disabled={pending || amount === ""} onClick={() => start(async () => {
        const r = await closeShift(counted, note); setMsg(r);
        if (r.ok) { setClosed({ ...shift, counted, diff: r.diff ?? 0 }); setAmount(""); setMsg(null); }
      })}>إغلاق الوردية وطباعة التقرير</button>
    </div>
  );
}
