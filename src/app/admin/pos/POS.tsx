"use client";
import { useMemo, useState, useTransition } from "react";
import { lookupCustomer, posSale } from "../actions";
import { placeholder, price } from "@/lib/format";
import { code128 } from "../barcodes/code128";

type Item = { id: string; name: string; label: string; sku: string; barcode: string | null; price: number; image: string | null; slug: string; stock: number };
type Line = Item & { qty: number };

type Shop = { address: string; phone: string; footer: string; taxNumber: string };

export function POS({ items, storeName, cashier, shop, shift }: { items: Item[]; storeName: string; cashier: string; shop: Shop; shift?: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [phone, setPhone] = useState("");
  const [cname, setCname] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [known, setKnown] = useState(false);
  const [anon, setAnon] = useState(false);
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [receipt, setReceipt] = useState<{ number: string; total: number; lines: Line[]; discount: number; payment: string; at: string } | null>(null);
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
      const r = await posSale(cart.map((l) => ({ variant_id: l.id, qty: l.qty })), payment, discount, anon ? "" : phone, anon ? "" : cname, !anon && marketing);
      if (!r.ok) { setMsg(r); return; }
      setReceipt({ number: r.number!, total: r.total!, lines: cart, discount, payment, at: new Date().toISOString() });
      setCart([]); setDiscount(0); setPhone(""); setCname(""); setMarketing(false); setKnown(false); setAnon(false); setMsg(null);
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
        <div className="narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {shift}
          <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, lineHeight: 1.5, cursor: "pointer" }}>
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--magenta)" }} />
              الزبونة لا ترغب بإعطاء بياناتها
            </label>
            {!anon && <>
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">هاتف العميلة<input className="a-in ltr" inputMode="tel" value={phone} placeholder="09xxxxxxxx"
                onChange={(e) => { setPhone(e.target.value); setKnown(false); }}
                onBlur={async () => { const c = await lookupCustomer(phone); if (c) { setKnown(true); if (c.name && !cname) setCname(c.name); if (c.marketing) setMarketing(true); } }} /></label>
              <label className="a-field">اسم العميلة<input className="a-in" value={cname} onChange={(e) => setCname(e.target.value)} /></label>
            </div>
            {known && <span className="caption tone-success" style={{ marginTop: -6 }}>عميلة مسجّلة سابقاً ✓</span>}
            <label style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 14, background: marketing ? "rgba(214,3,127,.08)" : "var(--surface-admin)", cursor: "pointer", fontSize: 14, lineHeight: 1.5 }}>
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--magenta)" }} />
              وافقت على إضافتها لقنوات ومجموعات العروض
            </label>
            </>}
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
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(58,42,48,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50, overflowY: "auto" }}>
          {/* ورق طابعة الفواتير الحرارية 80 مم: عرض الطباعة الفعلي ≈ 72 مم */}
          <style>{`@media print { @page { margin: 0; } html, body { background: #fff !important; } .receipt-paper { width: 72mm !important; margin: 0 auto !important; padding: 2mm 0 6mm !important; box-shadow: none !important; border-radius: 0 !important; } }`}</style>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <Receipt r={receipt} shop={shop} cashier={cashier} storeName={storeName} />
            <div className="no-print" style={{ display: "flex", gap: 8, width: "100%", maxWidth: 340 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => window.print()}>طباعة الفاتورة</button>
              <button className="btn soft" style={{ flex: 1, height: 48 }} onClick={() => setReceipt(null)}>بيع جديد</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const PAY: Record<string, string> = { cash: "نقداً", card: "بطاقة" };

/** فاتورة حرارية بعرض 80 مم: أسود على أبيض، خطوط واضحة، وباركود رقم الفاتورة */
function Receipt({ r, shop, cashier, storeName }: { r: { number: string; total: number; lines: Line[]; discount: number; payment: string; at: string }; shop: Shop; cashier: string; storeName: string }) {
  const sub = r.lines.reduce((s, l) => s + l.qty * l.price, 0);
  const d = new Date(r.at);
  const { bars, width } = code128(r.number);
  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: "2mm", fontSize: "11pt", lineHeight: 1.45 };
  const rule = <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />;
  return (
    <div className="receipt-paper" style={{ width: 340, maxWidth: "100%", background: "#fff", color: "#000", padding: "18px 16px", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,.25)", fontFamily: "Rubik, sans-serif" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1mm" }}>
        <img src="/icons/logo-stacked.svg" alt="شغلات بنات" style={{ height: 70, width: "auto", filter: "grayscale(1) brightness(0)" }} />
        {shop.address && <span style={{ fontSize: "9.5pt", lineHeight: 1.4 }}>{shop.address}</span>}
        {shop.phone && <span className="ltr" style={{ fontSize: "9.5pt", lineHeight: 1.4 }}>{shop.phone}</span>}
        {shop.taxNumber && <span style={{ fontSize: "9pt", lineHeight: 1.4 }}>الرقم الضريبي: {shop.taxNumber}</span>}
      </div>
      {rule}
      <div style={{ ...row, fontSize: "10pt" }}><span>فاتورة رقم</span><b className="ltr">{r.number}</b></div>
      <div style={{ ...row, fontSize: "10pt" }}><span>التاريخ</span><span className="ltr">{d.toLocaleDateString("en-GB")} {d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></div>
      <div style={{ ...row, fontSize: "10pt" }}><span>{storeName}</span><span>{cashier}</span></div>
      {rule}
      {r.lines.map((l) => (
        <div key={l.id} style={{ marginBottom: "1.5mm" }}>
          <div style={{ fontSize: "11pt", fontWeight: 600, lineHeight: 1.4 }}>{l.name}{l.label ? ` — ${l.label}` : ""}</div>
          <div style={{ ...row, fontSize: "10pt" }}><span className="ltr">{l.qty} × {price(l.price)}</span><b>{price(l.qty * l.price)}</b></div>
        </div>
      ))}
      {rule}
      <div style={row}><span>المجموع</span><span>{price(sub)}</span></div>
      {r.discount > 0 && <div style={row}><span>الخصم</span><span>−{price(r.discount)}</span></div>}
      <div style={{ ...row, fontSize: "14pt", fontWeight: 700, marginTop: "1mm" }}><span>الإجمالي</span><span>{price(r.total)}</span></div>
      <div style={{ ...row, fontSize: "10pt" }}><span>طريقة الدفع</span><span>{PAY[r.payment] ?? r.payment}</span></div>
      {rule}
      <svg viewBox={`0 0 ${width} 30`} width="100%" height="12mm" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
        {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={30} fill="#000" />)}
      </svg>
      <div style={{ textAlign: "center", fontSize: "10.5pt", lineHeight: 1.5, marginTop: "2mm" }}>{shop.footer}</div>
      <div style={{ textAlign: "center", fontSize: "8.5pt", lineHeight: 1.5 }}>الاستبدال خلال 7 أيام مع الفاتورة</div>
    </div>
  );
}
