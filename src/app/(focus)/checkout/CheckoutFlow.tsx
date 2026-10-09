"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useCart } from "@/components/CartProvider";
import { AddressForm, type Address } from "@/components/AddressForm";
import { getBrowserClient } from "@/lib/supabase/client";
import { price } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shop";
import { useT } from "@/components/LangProvider";

type Ship = { code: string; name: string; description: string | null; price: number };
const PAYMENTS = [
  { code: "cod", title: "الدفع عند الاستلام", line: "نقداً للمندوب عند التسليم", enabled: true },
  { code: "transfer", title: "تحويل", line: "نرسل لك بيانات التحويل ويُؤكَّد الطلب بعده", enabled: true },
  { code: "card", title: "بطاقة بنكية", line: "قريباً", enabled: false },
];
const STEPS = ["العنوان", "الشحن", "الدفع"];

export function CheckoutFlow({ addresses: initial, shipping }: { addresses: Address[]; shipping: Ship[] }) {
  const t = useT();
  const router = useRouter();
  const { lines, subtotal, clear, ready } = useCart();
  const [addresses, setAddresses] = useState(initial);
  const [step, setStep] = useState(0);
  const [addr, setAddr] = useState(initial[0]?.id ?? "");
  const [ship, setShip] = useState(shipping[0]?.code ?? "standard");
  const [pay, setPay] = useState("cod");
  const [adding, setAdding] = useState(initial.length === 0);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    try { setCoupon(sessionStorage.getItem("sb-coupon")); } catch {}
  }, []);
  useEffect(() => {
    if (ready && lines.length === 0 && !busy) router.replace("/cart");
  }, [ready, lines.length, busy, router]);

  const selectedShip = shipping.find((s) => s.code === ship);
  const shipCost = selectedShip ? (ship === "standard" && subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : Number(selectedShip.price)) : 0;

  async function placeOrder() {
    setBusy(true); setErr("");
    const { data, error } = await getBrowserClient().rpc("place_order", {
      items: lines.map((l) => ({ variant_id: l.variantId, qty: l.qty })),
      address_id: addr,
      shipping_code: ship,
      payment: pay,
      coupon: coupon,
      note: null,
    });
    if (error || !data) {
      setBusy(false);
      setErr(error?.message?.replace(/^.*?:\s*/, "") || t("تعذّر إتمام الطلب، حاولي مجدداً"));
      return;
    }
    try { sessionStorage.removeItem("sb-coupon"); } catch {}
    clear();
    router.replace(`/orders/${(data as { id: string }).id}?placed=1`);
  }

  const next = () => {
    if (step === 0 && !addr) { setErr(t("اختاري عنوان التوصيل أو أضيفي عنواناً")); return; }
    setErr(""); setStep((s) => Math.min(2, s + 1));
  };

  return (
    <main className="page tight no-nav">
      <div className="topbar">
        {step === 0
          ? <Link href="/cart" className="icon-btn" aria-label={t("رجوع")}><Icon name="back" stroke={2} /></Link>
          : <button type="button" className="icon-btn" aria-label={t("رجوع")} onClick={() => setStep((s) => s - 1)}><Icon name="back" stroke={2} /></button>}
        <h1 className="h-title">{t("إتمام الطلب")}</h1>
        <Link href="/" className="ph-logo" aria-label="شغلات بنات"><img src="/icons/logo-mark.svg" alt="" /></Link>
      </div>

      <ol style={{ display: "flex", gap: 8, padding: "0 8px", margin: 0, listStyle: "none" }}>
        {STEPS.map((s, i) => (
          <li key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, lineHeight: 1, background: i <= step ? "var(--magenta)" : "var(--light-blush)", color: i <= step ? "#fff" : "var(--deep-berry)" }}>
              {i < step ? <Icon name="check" size={18} stroke={2.6} /> : i + 1}
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.4, fontWeight: i === step ? 600 : 400, color: i === step ? "var(--magenta)" : "var(--text-muted)" }}>{t(s)}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h-section">{t("عنوان التوصيل")}</h2>
          {addresses.map((a) => (
            <button key={a.id} type="button" className={`option${addr === a.id ? " on" : ""}`} onClick={() => setAddr(a.id)}>
              <span className="icon-tile"><Icon name="pin" /></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{a.label}</span>
                <span className="caption" style={{ fontSize: 13, lineHeight: 1.6 }}>{a.city}{t("،")} {a.street}</span>
              </span>
              <span className="radio" />
            </button>
          ))}
          {adding ? (
            <div className="card" style={{ padding: 20 }}>
              <AddressForm
                makeDefault={addresses.length === 0}
                onSaved={(a) => { setAddresses((x) => [...x, a]); setAddr(a.id); setAdding(false); }}
                onCancel={addresses.length ? () => setAdding(false) : undefined}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} style={{ height: 52, borderRadius: 20, border: "1.5px dashed var(--rosy-gray)", background: "#fff", fontSize: 14, fontWeight: 500, color: "var(--deep-berry)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Icon name="plus" size={16} stroke={2.4} /> {t("إضافة عنوان جديد")}
            </button>
          )}
        </section>
      )}

      {step === 1 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h-section">{t("طريقة الشحن")}</h2>
          {shipping.map((s) => {
            const free = s.code === "standard" && subtotal >= FREE_SHIPPING_THRESHOLD;
            return (
              <button key={s.code} type="button" className={`option${ship === s.code ? " on" : ""}`} onClick={() => setShip(s.code)}>
                <span className="icon-tile"><Icon name="truck" /></span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{s.name}</span>
                  <span className="caption" style={{ fontSize: 13 }}>{s.description}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--magenta)", flexShrink: 0 }}>{free || Number(s.price) === 0 ? t("مجاني") : price(s.price, t)}</span>
                <span className="radio" />
              </button>
            );
          })}
        </section>
      )}

      {step === 2 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h-section">{t("طريقة الدفع")}</h2>
          {PAYMENTS.map((p) => (
            <button key={p.code} type="button" disabled={!p.enabled} className={`option${pay === p.code ? " on" : ""}`} onClick={() => setPay(p.code)} style={{ opacity: p.enabled ? 1 : 0.5 }}>
              <span className="icon-tile"><Icon name="card" /></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{t(p.title)}</span>
                <span className="caption" style={{ fontSize: 13 }}>{t(p.line)}</span>
              </span>
              <span className="radio" />
            </button>
          ))}
          <div className="soft-card">
            <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{t("ملخّص الطلب")}</span>
            <div className="kv"><span className="muted">{t("المنتجات (")}{lines.reduce((s, l) => s + l.qty, 0)})</span><span>{price(subtotal, t)}</span></div>
            <div className="kv"><span className="muted">{t("الشحن")}</span><span>{shipCost ? price(shipCost, t) : t("مجاني")}</span></div>
            {coupon && <div className="kv" style={{ color: "var(--magenta)" }}><span>{t("كود الخصم")}</span><span className="ltr">{coupon}</span></div>}
            <hr className="divider" />
            <div className="kv" style={{ fontSize: 16, fontWeight: 700 }}><span>{t("الإجمالي")}{coupon ? t(" قبل الخصم") : ""}</span><span style={{ color: "var(--magenta)" }}>{price(subtotal + shipCost, t)}</span></div>
          </div>
        </section>
      )}

      {err && <div className="alert tone-danger" role="alert">{err}</div>}

      <div className="action-bar">
        {step < 2
          ? <button type="button" className="btn cta block" onClick={next}>{t("متابعة")}</button>
          : <button type="button" className="btn cta block" onClick={placeOrder} disabled={busy}>{busy ? t("جارٍ إرسال الطلب…") : `${t("تأكيد الطلب")} · ${price(subtotal + shipCost, t)}`}</button>}
      </div>
    </main>
  );
}
