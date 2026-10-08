"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { price } from "@/lib/format";
import { code128 } from "../code128";

type It = { id: string; name: string; label: string; code: string; price: number; stock: number; qty: number };

/** مقاسات ملصقات طابعات Xprinter الحرارية (XP-235B / 236B / 365B …) بالملّيمتر */
const SIZES = [
  { key: "40x30", w: 40, h: 30, label: "40 × 30 مم (الأكثر شيوعاً)" },
  { key: "50x30", w: 50, h: 30, label: "50 × 30 مم" },
  { key: "50x25", w: 50, h: 25, label: "50 × 25 مم" },
  { key: "58x40", w: 58, h: 40, label: "58 × 40 مم" },
  { key: "30x20", w: 30, h: 20, label: "30 × 20 مم (صغير)" },
];
const KEY = "sb-label-settings";

function Barcode({ value, h }: { value: string; h: number }) {
  const { bars, width } = useMemo(() => code128(value), [value]);
  return (
    <svg viewBox={`0 0 ${width} 40`} width="100%" height={`${h}mm`} preserveAspectRatio="none" shapeRendering="crispEdges" role="img" aria-label={value}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={40} fill="#000" />)}
    </svg>
  );
}

export function PrintLabels({ items }: { items: It[] }) {
  const [size, setSize] = useState("40x30");
  const [showPrice, setShowPrice] = useState(true);
  const [mode, setMode] = useState<"one" | "stock" | "custom">("one");
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(items.map((i) => [i.id, i.qty])));

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); if (s.size) setSize(s.size); if (typeof s.showPrice === "boolean") setShowPrice(s.showPrice); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ size, showPrice })); } catch {} }, [size, showPrice]);

  const S = SIZES.find((x) => x.key === size)!;
  const count = (i: It) => (mode === "one" ? 1 : mode === "stock" ? Math.max(i.stock, 0) : qty[i.id] ?? 0);
  const labels = items.flatMap((i) => Array.from({ length: count(i) }, (_, k) => ({ ...i, k })));
  const small = S.h <= 20;

  return (
    <>
      {/* صفحة الطباعة = ملصق واحد بالضبط، بلا هوامش */}
      <style>{`@media print { @page { size: ${S.w}mm ${S.h}mm; margin: 0; } html, body { background: #fff !important; } .adm-main > *:not(.lbl-print) { display: none !important; } .lbl-print { display: block !important; } }`}</style>

      <div className="adm-top no-print">
        <div className="title-block"><h1 className="adm-h1">طباعة ملصقات الباركود</h1><span className="adm-sub">{items[0]?.name ?? "لا توجد قطع"} · {labels.length} ملصق</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/products" className="btn secondary">رجوع</Link>
          <button className="btn" disabled={!labels.length} onClick={() => window.print()}>طباعة {labels.length} ملصق</button>
        </div>
      </div>

      <div className="split no-print">
        <div className="acard wide" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            <label className="a-field">مقاس الملصق في الطابعة
              <select className="a-in" value={size} onChange={(e) => setSize(e.target.value)}>{SIZES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
            </label>
            <label className="a-field">عدد الملصقات
              <select className="a-in" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="one">ملصق واحد لكل لون/مقاس</option>
                <option value="stock">ملصق لكل قطعة في المخزون</option>
                <option value="custom">أحدد العدد بنفسي</option>
              </select>
            </label>
          </div>
          <label className="caption" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> إظهار السعر على الملصق</label>
          <div className="tw"><table className="tbl">
            <thead><tr><th>القطعة</th><th>الباركود</th><th style={{ textAlign: "center" }}>بالمخزون</th><th style={{ textAlign: "center" }}>الملصقات</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}<div className="caption">{i.label || "—"}</div></td>
                  <td className="caption ltr" style={{ textAlign: "right" }}>{i.code}</td>
                  <td style={{ textAlign: "center" }}>{i.stock}</td>
                  <td style={{ textAlign: "center" }}>{mode === "custom"
                    ? <input className="a-in cnt-in" type="number" min="0" value={qty[i.id] ?? 0} onChange={(e) => setQty((x) => ({ ...x, [i.id]: Math.max(0, Number(e.target.value)) }))} aria-label={`عدد ملصقات ${i.label}`} />
                    : count(i)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <h2 className="adm-h2" style={{ alignSelf: "stretch" }}>معاينة بالحجم الحقيقي</h2>
          {items[0] && <div style={{ boxShadow: "0 0 0 1px var(--rosy-gray)", borderRadius: 4 }}><Label it={items[0]} S={S} showPrice={showPrice} small={small} /></div>}
          <div className="caption" style={{ lineHeight: 1.8, alignSelf: "stretch" }}>
            <b>قبل أول طباعة:</b> في نافذة الطباعة اختر طابعة Xprinter الخاصة بالملصقات، واجعل «الهوامش: بلا» و«المقياس: 100%»، وتأكد أن مقاس الورق في إعدادات الطابعة هو <span className="ltr">{S.w} × {S.h}</span> مم.
          </div>
        </div>
      </div>

      <div className="lbl-print" style={{ display: "none" }}>
        {labels.map((l, n) => <Label key={l.id + l.k} it={l} S={S} showPrice={showPrice} small={small} last={n === labels.length - 1} />)}
      </div>
    </>
  );
}

function Label({ it, S, showPrice, small, last = true }: { it: It; S: { w: number; h: number }; showPrice: boolean; small: boolean; last?: boolean }) {
  const pad = small ? 1.2 : 2;
  return (
    <div style={{ width: `${S.w}mm`, height: `${S.h}mm`, padding: `${pad}mm ${pad + 0.5}mm`, boxSizing: "border-box", background: "#fff", color: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", overflow: "hidden", breakAfter: last ? "auto" : "page", pageBreakAfter: last ? "auto" : "always", fontFamily: "Rubik, sans-serif", textAlign: "center" }}>
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1mm", fontSize: small ? "5.5pt" : "7pt", fontWeight: 700, lineHeight: 1.3 }}>
        <span style={{ whiteSpace: "nowrap" }}>شغلات بنات</span>
        {showPrice && <span style={{ whiteSpace: "nowrap" }}>{price(it.price)}</span>}
      </div>
      <div style={{ width: "100%", fontSize: small ? "5.5pt" : "7pt", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}{it.label ? ` · ${it.label}` : ""}</div>
      <Barcode value={it.code} h={S.h * (small ? 0.38 : 0.42)} />
      <div className="ltr" style={{ fontSize: small ? "5pt" : "6.5pt", letterSpacing: "0.6pt", lineHeight: 1.2 }}>{it.code}</div>
    </div>
  );
}
