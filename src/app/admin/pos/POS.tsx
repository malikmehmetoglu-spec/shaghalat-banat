"use client";
import { useMemo, useState, useTransition } from "react";
import { posSale } from "../actions";
import { placeholder, price } from "@/lib/format";

type Item = { id: string; name: string; label: string; sku: string; barcode: string | null; price: number; image: string | null; slug: string; stock: number };
type Line = Item & { qty: number };

export function POS({ items, storeName, cashier }: { items: Item[]; storeName: string; cashier: string }) {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [receipt, setReceipt] = useState<{ number: string; total: number; lines: Line[]; discount: number } | null>(null);
  const [pending, start] = useTransition();

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? items.filter((i) => (i.name + i.sku + (i.barcode ?? "")).toLowerCase().includes(s)) : items).slice(0, 40);
  }, [q, items]);
  const sub = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const total = Math.max(0, sub - discount);

  function add(it: Item) {
    setMsg(null);
    setCart((c) => {
      const ex = c.find((l) => l.id === it.id);
      const want = (ex?.qty ?? 0) + 1;
      if (want > it.stock) { setMsg({ ok: false, message: `المتوفر في المحل من ${it.name} ${it.label}: ${it.stock} فقط` }); return c; }
      return ex ? c.map((l) => (l.id === it.id ? { ...l, qty: want } : l)) : [...c, { ...it, qty: 1 }];
    });
  }
  function onScan(e: React.FormEvent) {
    e.preventDefault();
    const code = q.trim();
    const exact = items.find((i) => i.barcode === code || i.sku.toLowerCase() === code.toLowerCase());
    if (exact) { add(exact); setQ(""); } else if (results.length === 1) { add(results[0]); setQ(""); }
  }
  const setQty = (id: string, qty: number) => setCart((c) => c.flatMap((l) => (l.id !== id ? [l] : qty <= 0 ? [] : [{ ...l, qty: Math.min(qty, l.stock) }])));

  function checkout() {
    start(async () => {
      const r = await posSale(cart.map((l) => ({ variant_id: l.id, qty: l.qty })), payment, discount, phone);
      if (!r.ok) { setMsg(r); return; }
      setReceipt({ number: r.number!, total: r.total!, lines: cart, discount });
      setCart([]); setDiscount(0); setPhone(""); setMsg(null);
    });
  }

  return (
    <>
      <div className="adm-top">
        <div className="title-block"><h1 className="adm-h1">نقطة البيع</h1><span className="adm-sub">{storeName}{cashier ? ` · ${cashier}` : ""}</span></div>
      </div>
      <div className="split">
        <div className="wide" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <form onSubmit={onScan}>
            <label className="sr" htmlFor="pq">بحث أو باركود</label>
            <input id="pq" autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="a-in" placeholder="امسحي الباركود أو ابحثي بالاسم / SKU ثم Enter" style={{ width: "100%" }} />
          </form>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
            {results.map((it) => (
              <button key={it.id} type="button" onClick={() => add(it)} disabled={it.stock <= 0} className="acard"
                style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6, textAlign: "right", cursor: it.stock > 0 ? "pointer" : "not-allowed", opacity: it.stock > 0 ? 1 : 0.5, border: "1px solid var(--border-row)", font: "inherit", color: "inherit" }}>
                <span style={{ width: "100%", aspectRatio: "1", flexShrink: 0, borderRadius: 14, background: it.image ? `url(${it.image}) center/cover` : placeholder(it.slug) }} />
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{it.name}</span>
                <span className="caption">{it.label}</span>
                <span className="row-between" style={{ fontSize: 13 }}><b>{price(it.price)}</b><span className="caption">{it.stock} بالمحل</span></span>
              </button>
            ))}
          </div>
        </div>
        <div className="narrow">
          <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 16 }}>
            <h2 className="adm-h2">الفاتورة</h2>
            {!cart.length && <span className="caption">لم تُضف منتجات بعد</span>}
            {cart.map((l) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{l.name}</span>
                  <span className="caption">{l.label} · {price(l.price)}</span>
                </span>
                <span className="stepper">
                  <button type="button" aria-label="إنقاص" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                  <span>{l.qty}</span>
                  <button type="button" aria-label="زيادة" onClick={() => setQty(l.id, l.qty + 1)}>+</button>
                </span>
              </div>
            ))}
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">خصم (ل.س)<input className="a-in" type="number" min="0" value={discount || ""} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} /></label>
              <label className="a-field">هاتف العميلة<input className="a-in ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="اختياري" /></label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["cash", "card"] as const).map((p) => <button key={p} type="button" className={`a-chip${payment === p ? " on" : ""}`} onClick={() => setPayment(p)} style={{ flex: 1 }}>{p === "cash" ? "نقداً" : "بطاقة"}</button>)}
            </div>
            <div className="kv"><span className="adm-sub">المجموع</span><span>{price(sub)}</span></div>
            {discount > 0 && <div className="kv"><span className="adm-sub">الخصم</span><span>−{price(discount)}</span></div>}
            <div className="kv" style={{ fontSize: 18 }}><b>الإجمالي</b><b style={{ color: "var(--magenta)" }}>{price(total)}</b></div>
            {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
            <button className="btn" disabled={!cart.length || pending} onClick={checkout}>{pending ? "جارٍ التسجيل…" : "إتمام البيع"}</button>
          </div>
        </div>
      </div>

      {receipt && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(58,42,48,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div className="acard receipt" style={{ width: 340, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <img src="/icons/logo-horizontal.svg" alt="شغلات بنات" style={{ height: 36, alignSelf: "center" }} />
            <span className="caption" style={{ textAlign: "center" }}>فاتورة <span className="ltr">#{receipt.number}</span> · {new Date().toLocaleString("en-GB")}</span>
            {receipt.lines.map((l) => <div key={l.id} className="kv" style={{ fontSize: 13 }}><span>{l.name} × {l.qty}</span><span>{price(l.qty * l.price)}</span></div>)}
            {receipt.discount > 0 && <div className="kv" style={{ fontSize: 13 }}><span>خصم</span><span>−{price(receipt.discount)}</span></div>}
            <div className="kv" style={{ fontSize: 16 }}><b>الإجمالي</b><b>{price(receipt.total)}</b></div>
            <span className="caption" style={{ textAlign: "center" }}>شكراً لزيارتك 💗</span>
            <div className="no-print" style={{ display: "flex", gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => window.print()}>طباعة</button>
              <button className="btn soft" style={{ flex: 1 }} onClick={() => setReceipt(null)}>بيع جديد</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
