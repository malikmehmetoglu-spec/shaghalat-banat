"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferMany } from "../../actions";

type Loc = { id: string; name: string };
type V = { id: string; name: string; label: string; sku: string; barcode: string | null; stock: Record<string, number> };

export function TransferForm({ locs, variants, initialFrom }: { locs: Loc[]; variants: V[]; initialFrom?: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom && locs.some((l) => l.id === initialFrom) ? initialFrom : locs[0]?.id ?? "");
  const [to, setTo] = useState(locs.find((l) => l.id !== (initialFrom || locs[0]?.id))?.id ?? "");
  const [q, setQ] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const avail = useMemo(() => variants.filter((v) => (v.stock[from] ?? 0) > 0), [variants, from]);
  const shown = avail.filter((v) => !q || (v.name + v.label + v.sku + (v.barcode ?? "")).toLowerCase().includes(q.toLowerCase()));
  const total = Object.entries(qty).reduce((s, [id, n]) => s + (avail.some((v) => v.id === id) ? n : 0), 0);

  if (locs.length < 2) return <div className="acard caption" style={{ lineHeight: 1.8 }}>تحتاجين موقعين على الأقل (مستودع ومحل) للتحويل بينهما. أضيفيهما من «المواقع والمستودعات».</div>;

  const submit = () => start(async () => {
    const r = await transferMany(from, to, avail.map((v) => ({ variant: v.id, qty: qty[v.id] ?? 0 })), note);
    setMsg(r);
    if (r.ok) { setQty({}); setNote(""); router.refresh(); }
  });

  return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 className="adm-h2">تحويل بين المواقع</h2>
      <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        <label className="a-field">من<select className="a-in" value={from} onChange={(e) => { setFrom(e.target.value); setQty({}); if (e.target.value === to) setTo(locs.find((l) => l.id !== e.target.value)?.id ?? ""); }}>{locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        <label className="a-field">إلى<select className="a-in" value={to} onChange={(e) => setTo(e.target.value)}>{locs.filter((l) => l.id !== from).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      </div>
      {avail.length === 0 ? (
        <span className="caption" style={{ lineHeight: 1.8 }}>لا توجد قطع في هذا الموقع حالياً.</span>
      ) : (
        <>
          <input className="a-in" placeholder="ابحثي أو امسحي الباركود" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto", scrollbarWidth: "none" }}>
            {shown.map((v) => {
              const max = v.stock[from] ?? 0;
              return (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 14, background: (qty[v.id] ?? 0) > 0 ? "rgba(214,3,127,.07)" : "var(--surface-admin)" }}>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{v.name}</span>
                    <span className="caption">{v.label || v.sku} · متوفر {max}</span>
                  </span>
                  <button type="button" className="btn soft" style={{ minHeight: 32, padding: "0 10px" }} onClick={() => setQty((x) => ({ ...x, [v.id]: max }))}>الكل</button>
                  <input aria-label={`كمية ${v.name}`} className="a-in cnt-in" type="number" min="0" max={max} value={qty[v.id] ?? ""} placeholder="0"
                    onChange={(e) => setQty((x) => ({ ...x, [v.id]: Math.min(max, Math.max(0, Number(e.target.value) || 0)) }))} />
                </div>
              );
            })}
          </div>
        </>
      )}
      <input className="a-in" placeholder="ملاحظة (اختياري): تزويد المحل" value={note} onChange={(e) => setNote(e.target.value)} />
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
      <button type="button" className="btn" disabled={pending || total === 0 || !to} onClick={submit}>{pending ? "جارٍ التحويل…" : `تحويل ${total} قطعة`}</button>
    </div>
  );
}
