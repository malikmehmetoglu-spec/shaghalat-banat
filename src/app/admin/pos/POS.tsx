"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lookupCustomer, posSale } from "../actions";
import { openShift } from "../finance/actions";
import { ShiftCard } from "../finance/cash/ShiftCard";
import { placeholder, price, timeHM } from "@/lib/format";
import { code128 } from "../barcodes/code128";

type Item = { id: string; name: string; label: string; sku: string; barcode: string | null; price: number; image: string | null; slug: string; stock: number };
type Line = Item & { qty: number };
type Shop = { address: string; phone: string; footer: string; taxNumber: string };
export type PosShift = { openedAt: string; by: string | null; opening: number; sales: number; expenses: number; draws: number; expected: number };

/** نقطة البيع: لا تعمل إلا بعد فتح الصندوق بمبلغ الدرج، والفاتورة ظاهرة كاملة دائماً */
export function POS({ items, storeName, cashier, shop, shift, lastCounted }: { items: Item[]; storeName: string; cashier: string; shop: Shop; shift: PosShift | null; lastCounted: number | null }) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  if (!shift) return <OpenGate storeName={storeName} cashier={cashier} suggested={lastCounted} onOpened={() => router.refresh()} />;
  return (
    <>
      <Register items={items} storeName={storeName} cashier={cashier} shop={shop} shift={shift} onClose={() => setClosing(true)} />
      {closing && (
        <div className="pos-modal" role="dialog" aria-modal="true" aria-label="إغلاق الصندوق" onClick={(e) => e.target === e.currentTarget && setClosing(false)}>
          <div className="pos-modal-box">
            <button type="button" className="pos-x" aria-label="رجوع" onClick={() => setClosing(false)}>✕</button>
            <ShiftCard shift={shift} title="إغلاق الصندوق ونهاية البيع" onDone={() => { setClosing(false); router.refresh(); }} />
          </div>
        </div>
      )}
    </>
  );
}

/** شاشة البداية: إدخال المبلغ الموجود في الدرج */
function OpenGate({ storeName, cashier, suggested, onOpened }: { storeName: string; cashier: string; suggested: number | null; onOpened: () => void }) {
  const [amount, setAmount] = useState(suggested != null ? String(suggested) : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === "" || Number(amount) < 0) { setMsg("اكتبي المبلغ الموجود في الدرج، ولو كان صفراً"); return; }
    start(async () => { const r = await openShift(Number(amount)); if (!r.ok) setMsg(r.message); else onOpened(); });
  };
  return (
    <div className="pos-gate">
      <form className="pos-gate-card" onSubmit={submit}>
        <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="pos-gate-mark" />
        <span className="pos-gate-kicker">{storeName}{cashier ? ` · ${cashier}` : ""}</span>
        <h1 className="pos-gate-title">افتحي الصندوق لبدء البيع</h1>
        <p className="pos-gate-sub">عدّي النقود الموجودة في الدرج الآن واكتبي المبلغ.</p>
        <label className="sr" htmlFor="open-amt">المبلغ في الدرج</label>
        <div className="pos-gate-in">
          <input id="open-amt" type="number" inputMode="numeric" min="0" autoFocus value={amount} onChange={(e) => { setAmount(e.target.value); setMsg(null); }} placeholder="0" />
          <span>ل.س</span>
        </div>
        {suggested != null && <span className="caption">بقي في الدرج عند إغلاق آخر مرة: {price(suggested)}</span>}
        {msg && <span className="a-flash tone-danger">{msg}</span>}
        <button className="btn pos-big" disabled={pending}>{pending ? "جارٍ الفتح…" : "فتح الصندوق"}</button>
      </form>
    </div>
  );
}

function Register({ items, storeName, cashier, shop, shift, onClose }: { items: Item[]; storeName: string; cashier: string; shop: Shop; shift: PosShift; onClose: () => void }) {
  const router = useRouter();
  const search = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [showCustomer, setShowCustomer] = useState(false);
  const [phone, setPhone] = useState("");
  const [cname, setCname] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [known, setKnown] = useState(false);
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [sheet, setSheet] = useState(false); // الفاتورة على الهاتف
  const [receipt, setReceipt] = useState<{ number: string; total: number; lines: Line[]; discount: number; payment: string; at: string } | null>(null);
  const [pending, start] = useTransition();

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? items.filter((i) => (i.name + " " + i.label + " " + i.sku + " " + (i.barcode ?? "")).toLowerCase().includes(s)) : items).slice(0, 60);
  }, [q, items]);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const sub = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const total = Math.max(0, sub - discount);
  const refocus = () => { if (window.matchMedia("(min-width: 768px)").matches) search.current?.focus(); };
  useEffect(() => { if (!receipt) refocus(); }, [receipt]);

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
    const code2 = code.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));
    const exact = items.find((i) => i.barcode === code2 || i.barcode === code || i.sku.toLowerCase() === code.toLowerCase());
    if (exact) { add(exact); setQ(""); } else if (results.length === 1) { add(results[0]); setQ(""); }
  }
  const setQty = (id: string, qty: number) => setCart((c) => c.flatMap((l) => (l.id !== id ? [l] : qty <= 0 ? [] : [{ ...l, qty: Math.min(qty, l.stock) }])));
  const reset = () => { setCart([]); setDiscount(0); setPhone(""); setCname(""); setMarketing(false); setKnown(false); setShowCustomer(false); setPayment("cash"); setMsg(null); };

  function checkout() {
    if (discount > sub) { setMsg({ ok: false, message: "الخصم أكبر من المجموع" }); return; }
    start(async () => {
      const r = await posSale(cart.map((l) => ({ variant_id: l.id, qty: l.qty })), payment, discount, phone.trim(), phone.trim() ? cname : "", !!phone.trim() && marketing);
      if (!r.ok) { setMsg(r); return; }
      setReceipt({ number: r.number!, total: r.total!, lines: cart, discount, payment, at: new Date().toISOString() });
      setSheet(false); reset(); router.refresh();
    });
  }

  return (
    <div className="pos">
      <header className="pos-head">
        <div className="pos-head-t">
          <h1 className="adm-h1">نقطة البيع</h1>
          <span className="adm-sub">{storeName}{cashier ? ` · ${cashier}` : ""} · الصندوق مفتوح منذ {timeHM(shift.openedAt)}</span>
        </div>
        <button type="button" className="btn secondary pos-close-btn" onClick={onClose}>إغلاق الصندوق</button>
      </header>

      <section className="pos-products" aria-label="المنتجات">
        <form onSubmit={onScan} className="pos-search">
          <label className="sr" htmlFor="pq">بحث أو باركود</label>
          <input id="pq" ref={search} autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="a-in" placeholder="امسحي الباركود أو اكتبي اسم المنتج" autoComplete="off" />
          {q && <button type="button" className="pos-clear" aria-label="مسح البحث" onClick={() => { setQ(""); search.current?.focus(); }}>✕</button>}
        </form>
        <div className="pos-grid">
          {results.map((it) => {
            const inCart = cart.find((l) => l.id === it.id)?.qty ?? 0;
            return (
              <button key={it.id} type="button" onClick={() => { add(it); refocus(); }} disabled={it.stock <= 0} className={`pos-item${inCart ? " in" : ""}`}>
                <span className="pos-item-img" style={{ background: it.image ? `url(${it.image}) center/cover` : placeholder(it.slug) }}>
                  {inCart > 0 && <span className="pos-item-n">{inCart}</span>}
                </span>
                <span className="pos-item-name">{it.name}</span>
                {it.label && <span className="pos-item-lbl">{it.label}</span>}
                <span className="pos-item-row"><b>{price(it.price)}</b><span className={it.stock <= 2 ? "low" : ""}>{it.stock <= 0 ? "نفد" : `${it.stock} قطعة`}</span></span>
              </button>
            );
          })}
          {!results.length && <p className="caption pos-empty">لا يوجد منتج بهذا الاسم أو الباركود</p>}
        </div>
      </section>

      <aside className={`pos-bill${sheet ? " open" : ""}`} aria-label="الفاتورة">
        <div className="pos-bill-head">
          <h2 className="adm-h2">الفاتورة {count > 0 && <span className="pos-count">{count}</span>}</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {cart.length > 0 && <button type="button" className="link-btn pos-link" onClick={reset}>تفريغ</button>}
            <button type="button" className="pos-x pos-sheet-x" aria-label="إخفاء الفاتورة" onClick={() => setSheet(false)}>✕</button>
          </div>
        </div>

        <div className="pos-lines">
          {!cart.length && <div className="pos-lines-empty"><span>اضغطي على منتج أو امسحي الباركود لإضافته هنا</span></div>}
          {cart.map((l) => (
            <div key={l.id} className="pos-line">
              <span className="pos-line-img" style={{ background: l.image ? `url(${l.image}) center/cover` : placeholder(l.slug) }} />
              <span className="pos-line-t">
                <span className="pos-line-name">{l.name}</span>
                <span className="caption">{l.label ? `${l.label} · ` : ""}{price(l.price)}</span>
              </span>
              <span className="pos-line-r">
                <b>{price(l.qty * l.price)}</b>
                <span className="stepper">
                  <button type="button" aria-label="إنقاص" onClick={() => setQty(l.id, l.qty - 1)}>−</button>
                  <span>{l.qty}</span>
                  <button type="button" aria-label="زيادة" onClick={() => setQty(l.id, l.qty + 1)}>+</button>
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="pos-foot">
          <button type="button" className="pos-cust-toggle" aria-expanded={showCustomer} onClick={() => setShowCustomer((v) => !v)}>
            <span>بيانات الزبونة {phone ? <b className="ltr">{phone}</b> : <span className="caption">(اختياري)</span>}</span>
            <span aria-hidden="true">{showCustomer ? "▴" : "▾"}</span>
          </button>
          {showCustomer && (
            <div className="pos-cust">
              <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                <label className="a-field">الهاتف<input className="a-in ltr" inputMode="tel" value={phone} placeholder="09xxxxxxxx"
                  onChange={(e) => { setPhone(e.target.value); setKnown(false); }}
                  onBlur={async () => { if (!phone.trim()) return; const c = await lookupCustomer(phone); if (c) { setKnown(true); if (c.name && !cname) setCname(c.name); if (c.marketing) setMarketing(true); } }} /></label>
                <label className="a-field">الاسم<input className="a-in" value={cname} onChange={(e) => setCname(e.target.value)} /></label>
              </div>
              {known && <span className="caption tone-success">زبونة مسجّلة سابقاً ✓</span>}
              {phone.trim() && (
                <label className="pos-check">
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                  وافقت على إضافتها لمجموعات العروض
                </label>
              )}
            </div>
          )}

          <div className="pos-row2">
            <label className="pos-disc">خصم<input className="a-in" type="number" inputMode="numeric" min="0" value={discount || ""} placeholder="0" onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} /></label>
            <div className="pos-pay" role="radiogroup" aria-label="طريقة الدفع">
              {(["cash", "card"] as const).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={payment === p} className={payment === p ? "on" : ""} onClick={() => setPayment(p)}>{p === "cash" ? "نقداً" : "بطاقة"}</button>
              ))}
            </div>
          </div>

          <div className="pos-totals">
            {discount > 0 && <div className="kv"><span className="adm-sub">المجموع</span><span>{price(sub)}</span></div>}
            {discount > 0 && <div className="kv"><span className="adm-sub">الخصم</span><span>−{price(discount)}</span></div>}
            <div className="kv pos-total"><b>الإجمالي</b><b>{price(total)}</b></div>
          </div>
          {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
          <button className="btn pos-big" disabled={!cart.length || pending} onClick={checkout}>{pending ? "جارٍ التسجيل…" : "إتمام البيع"}</button>
        </div>
      </aside>

      {/* الهاتف: شريط سفلي ثابت يفتح الفاتورة */}
      <div className="pos-mbar">
        <button type="button" className="pos-mbar-bill" onClick={() => setSheet(true)}>
          <span>الفاتورة{count > 0 && <span className="pos-count">{count}</span>}</span>
          <b>{price(total)}</b>
        </button>
      </div>
      {sheet && <div className="pos-scrim" onClick={() => setSheet(false)} />}

      {receipt && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(58,42,48,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 80, overflowY: "auto" }}>
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
    </div>
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
