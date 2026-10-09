"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordStoreReturn } from "../actions";
import { price } from "@/lib/format";

type It = { id: string; name: string; label: string; barcode: string | null; sku: string; price: number; stock: number };
type Line = It & { qty: number };

export function StoreReturnForm({ items }: { items: It[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [kind, setKind] = useState<"return" | "cancel">("return");
  const [refundFrom, setRefundFrom] = useState<"1110" | "1120" | "none">("1110");
  const [refund, setRefund] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return items.filter((i) => i.barcode === s || (i.name + " " + i.label + " " + i.sku + " " + (i.barcode ?? "")).toLowerCase().includes(s)).slice(0, 8);
  }, [q, items]);
  const suggested = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const amount = refundFrom === "none" ? 0 : refund ?? suggested;

  const add = (it: It) => {
    setLines((ls) => ls.some((l) => l.id === it.id) ? ls.map((l) => l.id === it.id ? { ...l, qty: l.qty + 1 } : l) : [...ls, { ...it, qty: 1 }]);
    setQ(""); setRefund(null);
  };
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter" && results[0]) { e.preventDefault(); add(results[0]); } };
  const reset = () => { setLines([]); setReason(""); setPhone(""); setRefund(null); setKind("return"); setRefundFrom("1110"); };

  const submit = () => start(async () => {
    const r = await recordStoreReturn({ items: lines.map((l) => ({ variant: l.id, qty: l.qty })), kind, refund: amount, refundFrom, reason, phone });
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) { reset(); setOpen(false); router.refresh(); }
  });

  const chip = (on: boolean) => ({ className: on ? "btn" : "btn soft", style: { minHeight: 38, padding: "0 14px" } as React.CSSProperties });

  return (
    <>
      {msg && <div className={`acard caption ${msg.ok ? "tone-success" : "tone-warning"}`} role="status" style={{ marginBottom: 12 }}>{msg.text}</div>}
      {!open ? (
        <button className="btn" onClick={() => { setOpen(true); setMsg(null); }}>＋ تسجيل مرتجع في المحل</button>
      ) : (
        <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h2 className="adm-h2">تسجيل مرتجع في المحل</h2>
            <button className="btn soft" onClick={() => { reset(); setOpen(false); }}>إلغاء</button>
          </div>

          <div>
            <div className="caption" style={{ marginBottom: 6 }}>1. ما الذي حدث؟</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button {...chip(kind === "return")} onClick={() => setKind("return")}>زبونة أعادت قطعة</button>
              <button {...chip(kind === "cancel")} onClick={() => setKind("cancel")}>تراجعت عن الشراء</button>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <label className="caption" htmlFor="rq" style={{ display: "block", marginBottom: 6 }}>2. امسحي باركود القطعة أو ابحثي بالاسم</label>
            <input id="rq" className="a-in" autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onEnter} placeholder="باركود / اسم المنتج" style={{ width: "100%" }} />
            {results.length > 0 && (
              <div className="acard flush" style={{ position: "absolute", insetInline: 0, top: "100%", zIndex: 5, marginTop: 4, maxHeight: 300, overflow: "auto" }}>
                {results.map((r) => (
                  <button key={r.id} onClick={() => add(r)} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px 12px", background: "none", border: 0, borderBottom: "1px solid rgba(0,0,0,.06)", cursor: "pointer", textAlign: "start", font: "inherit" }}>
                    <span>{r.name}<span className="caption"> {r.label && `· ${r.label}`}</span></span>
                    <span className="caption">{price(r.price)} · بالمحل {r.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="tw"><table className="tbl">
              <thead><tr><th>القطعة</th><th style={{ textAlign: "center" }}>العدد</th><th>السعر</th><th></th></tr></thead>
              <tbody>{lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}<div className="caption">{l.label}</div></td>
                  <td style={{ textAlign: "center" }}><input aria-label="العدد" className="a-in cnt-in" type="number" min="1" value={l.qty} onChange={(e) => { setRefund(null); setLines((ls) => ls.map((x) => x.id === l.id ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)); }} /></td>
                  <td className="caption">{price(l.price * l.qty)}</td>
                  <td><button className="btn soft" style={{ minHeight: 32, padding: "0 10px" }} onClick={() => { setRefund(null); setLines((ls) => ls.filter((x) => x.id !== l.id)); }} aria-label="إزالة">✕</button></td>
                </tr>))}
              </tbody>
            </table></div>
          )}

          <div>
            <div className="caption" style={{ marginBottom: 6 }}>3. المبلغ المُعاد للزبونة</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button {...chip(refundFrom === "1110")} onClick={() => setRefundFrom("1110")}>نقداً من الصندوق</button>
              <button {...chip(refundFrom === "1120")} onClick={() => setRefundFrom("1120")}>تحويل / بطاقة</button>
              <button {...chip(refundFrom === "none")} onClick={() => setRefundFrom("none")}>بدون مبلغ (استبدال)</button>
            </div>
            {refundFrom !== "none" && (
              <input aria-label="المبلغ المعاد" className="a-in" type="number" min="0" value={refund ?? suggested} onChange={(e) => setRefund(Math.max(0, Number(e.target.value) || 0))} style={{ maxWidth: 220 }} />
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
            <input className="a-in" placeholder="السبب (اختياري): المقاس، اللون…" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="السبب" />
            <input className="a-in ltr" placeholder="رقم الزبونة (اختياري)" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="رقم الزبونة" inputMode="tel" />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid rgba(0,0,0,.06)", paddingTop: 12 }}>
            <span className="caption">ستعود {lines.reduce((s, l) => s + l.qty, 0)} قطعة إلى مخزون المحل{amount > 0 ? ` · يُعاد ${price(amount)}` : ""}</span>
            <button className="btn" disabled={pending || !lines.length} onClick={submit}>{pending ? "جارٍ الحفظ…" : "تأكيد المرتجع"}</button>
          </div>
        </div>
      )}
    </>
  );
}
