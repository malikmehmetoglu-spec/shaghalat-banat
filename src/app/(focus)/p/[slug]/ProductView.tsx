"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { FavButton } from "@/components/FavButton";
import { useCart } from "@/components/CartProvider";
import { placeholder, price } from "@/lib/format";
import type { ProductWithVariants } from "@/lib/types";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shop";
import { useT } from "@/components/LangProvider";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export function ProductView({ p, isFav }: { p: ProductWithVariants; isFav: boolean }) {
  const t = useT();
  const router = useRouter();
  const { add, count } = useCart();
  const variants = p.product_variants;

  // اللون أولاً ثم المقاسات المتوفرة لذلك اللون — يدعم منتجات بلا لون أو بلا مقاس أو مزيج منهما
  const sortSizes = (arr: string[]) => arr.sort((a, b) => (SIZE_ORDER.indexOf(a) + 1 || 99) - (SIZE_ORDER.indexOf(b) + 1 || 99) || (parseFloat(a) || 0) - (parseFloat(b) || 0));
  const colors = useMemo(() => {
    const m = new Map<string, { name: string; hex: string; avail: number }>();
    variants.forEach((v) => {
      const k = v.color_name ?? "";
      const cur = m.get(k);
      m.set(k, { name: k, hex: v.color_hex ?? cur?.hex ?? "#ccc", avail: (cur?.avail ?? 0) + (v.available ?? 0) });
    });
    return Array.from(m.values());
  }, [variants]);
  const hasColors = colors.some((c) => c.name !== "");

  const firstAvail = variants.find((v) => v.available > 0) ?? variants[0];
  const [color, setColor] = useState(firstAvail?.color_name ?? "");
  const [size, setSize] = useState(firstAvail?.size ?? "");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState(0);
  const [added, setAdded] = useState(false);

  const ofColor = (c: string) => variants.filter((v) => (v.color_name ?? "") === c);
  const sizes = useMemo(() => sortSizes(Array.from(new Set(ofColor(color).map((v) => v.size ?? "")))), [variants, color]); // eslint-disable-line react-hooks/exhaustive-deps
  const showSizes = sizes.some((x) => x !== "");
  const current = ofColor(color).find((v) => (v.size ?? "") === size) ?? ofColor(color)[0];
  const sizeAvailable = (sz: string) => ofColor(color).some((v) => (v.size ?? "") === sz && v.available > 0);
  const pickColor = (c: string) => {
    setColor(c); setQty(1);
    const list = ofColor(c);
    const keep = list.find((v) => (v.size ?? "") === size && v.available > 0);
    setSize((keep ?? list.find((v) => v.available > 0) ?? list[0])?.size ?? "");
  };
  const unit = Number(current?.price_override ?? p.price);
  const stock = current?.available ?? 0;
  const img = p.images?.[0];

  function addToCart() {
    if (!current || stock <= 0) return;
    add({
      variantId: current.id,
      productSlug: p.slug,
      name: p.name,
      label: [current.size, current.color_name].filter(Boolean).join(" · "),
      unitPrice: unit,
      qty: Math.min(qty, stock),
      image: img ?? null,
      max: stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  const tabs = [
    { label: t("الوصف"), text: p.description ?? "" },
    { label: t("التوصيل"), text: t("التوصيل خلال 2 إلى 4 أيام عمل داخل سوريا. الشحن مجاني للطلبات فوق {f}، ويمكنك الاستبدال خلال 7 أيام من الاستلام. نغلّف طلبك بخصوصية تامة.", { f: price(FREE_SHIPPING_THRESHOLD, t) }) },
    { label: t("التقييمات"), text: t("تقييم {r} من {n} عميلة.", { r: Number(p.rating).toFixed(1), n: p.rating_count }) },
  ];

  return (
    <main className="page tight wide pv" style={{ paddingBottom: 140 }}>
      <div className="pv-media" style={{ position: "relative", height: 420, borderRadius: 32, overflow: "hidden", background: img ? `url(${img}) center/cover` : placeholder(p.slug), boxShadow: "0 16px 36px rgba(142,2,84,0.22)" }}>
        {!img && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,.75)" }}>{t("[صورة المنتج]")}</div>}
        <div className="pv-actions" style={{ position: "absolute", top: 16, right: 16, left: 16, display: "flex", justifyContent: "space-between" }}>
          <button className="icon-btn" aria-label={t("رجوع")} onClick={() => router.back()} style={{ width: 44, height: 44, background: "rgba(255,255,255,.92)" }}><Icon name="back" stroke={2} /></button>
          <div style={{ display: "flex", gap: 10 }}>
            <FavButton productId={p.id} initial={isFav} className="icon-btn" size={20} />
            <Link href="/cart" className="icon-btn" aria-label={t("السلة")} style={{ width: 44, height: 44, background: "rgba(255,255,255,.92)" }}>
              <Icon name="bag" />
              {count > 0 && <span className="badge-count">{count}</span>}
            </Link>
          </div>
        </div>
      </div>

      <div className="pv-info">
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div className="title-block">
          <h1 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.5 }}>{p.name}</h1>
          <p className="caption" style={{ fontSize: 13 }}>{p.subtitle}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.5, color: "var(--magenta)" }}>{price(unit, t)}</span>
          {Number(p.compare_at_price) > unit && <s className="caption">{price(p.compare_at_price, t)}</s>}
          <span className="caption ltr">★ {Number(p.rating).toFixed(1)} ({p.rating_count})</span>
        </div>
      </div>

      <div className="soft-card" style={{ gap: 20 }}>
        {showSizes && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{t("المقاس")}</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {sizes.map((s) => (
                <button key={s || "-"} type="button" className={`size${(current?.size ?? "") === s ? " on" : ""}`} onClick={() => { setSize(s); setQty(1); }} disabled={!sizeAvailable(s)} aria-pressed={(current?.size ?? "") === s}>{s || t("مقاس واحد")}</button>
              ))}
            </div>
          </div>
        )}
        {hasColors && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{t("اللون:")}</span>
              <span className="muted">{color || t("بدون لون")}</span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {colors.map((c) => (
                <button key={c.name || "-"} type="button" className={`swatch${color === c.name ? " on" : ""}`} onClick={() => pickColor(c.name)} aria-label={c.name || t("بدون لون")} aria-pressed={color === c.name} title={c.name || t("بدون لون")} style={c.avail <= 0 ? { opacity: .35 } : undefined}>
                  <span style={{ background: c.name ? c.hex : "repeating-linear-gradient(45deg,#eee 0 4px,#fff 4px 8px)" }} />
                </button>
              ))}
            </div>
          </div>
        )}
        <span className="caption" style={{ color: stock > 0 && stock < 4 ? "var(--warning-fg)" : stock > 0 ? "var(--success-fg)" : "var(--danger-fg)", fontWeight: 500 }}>
          {stock <= 0 ? t("غير متوفر حالياً بهذا الخيار") : stock < 4 ? t("بقي {n} قطع فقط", { n: stock }) : t("متوفر")}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="seg" role="tablist">
          {tabs.map((tb, i) => <button key={tb.label} type="button" role="tab" aria-selected={tab === i} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{tb.label}</button>)}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.9, color: "var(--neutral-fg)" }}>{tabs[tab].text}</p>
      </div>

      <div className="action-bar">
        <div className="qty lg">
          <button type="button" aria-label={t("زيادة الكمية")} onClick={() => setQty((q) => Math.min(q + 1, Math.max(stock, 1)))}><Icon name="plus" size={16} stroke={2.4} /></button>
          <span style={{ fontSize: 16 }}>{qty}</span>
          <button type="button" aria-label={t("إنقاص الكمية")} onClick={() => setQty((q) => Math.max(1, q - 1))}><Icon name="minus" size={16} stroke={2.4} /></button>
        </div>
        <button type="button" className="btn cta" style={{ flex: 1 }} onClick={addToCart} disabled={stock <= 0}>
          {added ? t("تمت الإضافة ✓") : stock <= 0 ? t("غير متوفر") : t("أضيفي إلى السلة")}
          {!added && stock > 0 && <Icon name="bag" stroke={2} />}
        </button>
      </div>
      </div>
    </main>
  );
}
