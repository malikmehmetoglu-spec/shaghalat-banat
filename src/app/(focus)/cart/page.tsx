"use client";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useCart } from "@/components/CartProvider";
import { getBrowserClient } from "@/lib/supabase/client";
import { placeholder, price } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shop";
import { useT } from "@/components/LangProvider";

export default function CartPage() {
  const t = useT();
  const { lines, setQty, remove, subtotal, count, ready } = useCart();
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const left = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;

  async function applyCode() {
    if (!code.trim()) return;
    const { data, error } = await getBrowserClient().rpc("validate_coupon", { code_in: code.trim(), subtotal_in: subtotal });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setCoupon(null);
      setMsg({ ok: false, text: t("الكود غير صالح أو لا ينطبق على هذا الطلب") });
    } else {
      setCoupon({ code: row.code, discount: Number(row.discount) });
      setMsg({ ok: true, text: row.kind === "free_shipping" ? t("تم تطبيق الشحن المجاني") : t("تم تطبيق خصم {x}", { x: price(row.discount, t) }) });
      try { sessionStorage.setItem("sb-coupon", row.code); } catch {}
    }
  }

  if (ready && lines.length === 0) {
    return (
      <main className="page" style={{ paddingBottom: 40 }}>
        <div className="topbar">
          <Link href="/" className="icon-btn" aria-label={t("رجوع")}><Icon name="back" stroke={2} /></Link>
          <h1 className="h-title">{t("سلّتي")}</h1>
          <span style={{ width: 48 }} />
        </div>
        <div className="empty">
          <span className="ring"><Icon name="bag" size={40} stroke={1.6} /></span>
          <div className="title-block"><span className="h-section">{t("سلّتك فارغة")}</span><span className="muted">{t("أضيفي ما يعجبك وسيظهر هنا")}</span></div>
          <Link href="/" className="btn" style={{ height: 48, padding: "0 28px" }}>{t("تسوّقي الآن")}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page tight no-nav">
      <div className="topbar">
        <Link href="/" className="icon-btn" aria-label={t("رجوع")}><Icon name="back" stroke={2} /></Link>
        <h1 className="h-title">{t("سلّتي (")}{count})</h1>
        <span style={{ width: 48 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 20, background: "var(--light-blush)" }}>
        <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--deep-berry)", fontWeight: 500 }}>
          {left > 0 ? t("أضيفي {x} لتحصلي على شحن مجاني", { x: price(left, t) }) : t("رائع! طلبك مؤهّل للشحن المجاني")}
        </span>
        <span style={{ display: "block", height: 6, borderRadius: 3, background: "#fff", overflow: "hidden" }}>
          <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--magenta)", width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }} />
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {lines.map((l) => (
          <div key={l.variantId} className="card" style={{ display: "flex", gap: 14, padding: 12 }}>
            <Link href={`/p/${l.productSlug}`} aria-label={l.name} style={{ width: 88, height: 108, flexShrink: 0, borderRadius: 18, background: l.image ? `url(${l.image}) center/cover` : placeholder(l.productSlug) }} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 }}>
              <div className="row-between" style={{ alignItems: "flex-start", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{l.name}</span>
                  <span className="caption">{l.label}</span>
                </div>
                <button type="button" aria-label={t("حذف من السلة")} onClick={() => remove(l.variantId)} style={{ width: 36, height: 36, flexShrink: 0, padding: 0, borderRadius: "50%", border: "none", background: "var(--light-blush)", color: "var(--deep-berry)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="trash" size={16} stroke={2} />
                </button>
              </div>
              <div className="row-between" style={{ gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5, color: "var(--magenta)" }}>{price(l.unitPrice * l.qty, t)}</span>
                <div className="qty">
                  <button type="button" aria-label={t("زيادة الكمية")} onClick={() => setQty(l.variantId, l.qty + 1)}><Icon name="plus" size={14} stroke={2.6} /></button>
                  <span>{l.qty}</span>
                  <button type="button" aria-label={t("إنقاص الكمية")} onClick={() => setQty(l.variantId, l.qty - 1)}><Icon name="minus" size={14} stroke={2.6} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, height: 56, paddingInlineStart: 20, paddingInlineEnd: 6, borderRadius: 28, border: "1.5px dashed var(--rosy-gray)" }}>
          <label htmlFor="cp" className="sr">{t("كود الخصم")}</label>
          <input id="cp" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("أدخلي كود الخصم")} style={{ flex: 1, minWidth: 0, height: 44, border: "none", outline: "none", fontSize: 14, background: "transparent" }} />
          <button type="button" className="btn dark" onClick={applyCode}>{t("تطبيق")}</button>
        </div>
        {msg && <span className="caption" style={{ padding: "0 12px", color: msg.ok ? "var(--deep-berry)" : "var(--danger-fg)" }}>{msg.text}</span>}
      </div>

      <div className="soft-card">
        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{t("ملخّص الطلب")}</span>
        <div className="kv"><span className="muted">{t("المجموع الفرعي")}</span><span>{price(subtotal, t)}</span></div>
        <div className="kv"><span className="muted">{t("الشحن")}</span><span>{left > 0 ? t("يُحدَّد في الخطوة التالية") : t("مجاني")}</span></div>
        {discount > 0 && <div className="kv" style={{ color: "var(--magenta)" }}><span>{t("الخصم")}</span><span>- {price(discount, t)}</span></div>}
        <hr className="divider" />
        <div className="kv" style={{ fontSize: 16, fontWeight: 700 }}><span>{t("الإجمالي")}</span><span style={{ color: "var(--magenta)" }}>{price(subtotal - discount, t)}</span></div>
      </div>

      <div className="action-bar" style={{ gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          <span className="caption">{t("الإجمالي")}</span>
          <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{price(subtotal - discount, t)}</span>
        </div>
        <Link href="/checkout" className="btn cta" style={{ flex: 1 }}>{t("إتمام الطلب")} <Icon name="forward" size={18} stroke={2.2} /></Link>
      </div>
    </main>
  );
}
