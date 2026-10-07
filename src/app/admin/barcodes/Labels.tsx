"use client";
import { useMemo, useState } from "react";
import { price } from "@/lib/format";
import { code128 } from "./code128";

type It = { id: string; name: string; label: string; code: string; price: number };

function Barcode({ value }: { value: string }) {
  const { bars, width } = useMemo(() => code128(value), [value]);
  return (
    <svg viewBox={`0 0 ${width} 50`} width="100%" height="44" preserveAspectRatio="none" role="img" aria-label={value}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={50} fill="#000" />)}
    </svg>
  );
}

export function Labels({ items }: { items: It[] }) {
  const [q, setQ] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [showPrice, setShowPrice] = useState(true);
  const list = items.filter((i) => !q || (i.name + i.code).toLowerCase().includes(q.toLowerCase()));
  const sheet = items.flatMap((i) => Array.from({ length: qty[i.id] ?? 0 }, (_, k) => ({ ...i, k })));

  return (
    <>
      <div className="adm-top no-print">
        <div className="title-block"><h1 className="adm-h1">الباركود والملصقات</h1><span className="adm-sub">اختاري المنتجات وعدد الملصقات ثم اطبعي · الرمز: الباركود إن وُجد وإلا SKU</span></div>
        <button className="btn" disabled={!sheet.length} onClick={() => window.print()}>طباعة {sheet.length} ملصق</button>
      </div>
      <div className="split no-print">
        <div className="acard flush wide">
          <div style={{ padding: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label className="sr" htmlFor="bq">بحث</label>
            <input id="bq" className="a-in" placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 200px" }} />
            <label className="caption" style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> إظهار السعر</label>
            <button className="btn soft" onClick={() => setQty(Object.fromEntries(list.map((i) => [i.id, 1])))}>ملصق لكل منتج</button>
            <button className="btn soft" onClick={() => setQty({})}>مسح</button>
          </div>
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>المنتج</th><th>الرمز</th><th style={{ textAlign: "center" }}>عدد الملصقات</th></tr></thead>
              <tbody>
                {list.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}<div className="caption">{i.label}</div></td>
                    <td className="caption ltr" style={{ textAlign: "right" }}>{i.code}</td>
                    <td style={{ textAlign: "center" }}><input aria-label={`عدد ملصقات ${i.code}`} className="a-in cnt-in" type="number" min="0" value={qty[i.id] ?? ""} onChange={(e) => setQty((x) => ({ ...x, [i.id]: Math.max(0, Number(e.target.value)) }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="narrow acard" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="adm-h2">معاينة</h2>
          {items[0] && <LabelCard it={list[0] ?? items[0]} showPrice={showPrice} />}
        </div>
      </div>
      <div className="label-sheet">
        {sheet.map((s) => <LabelCard key={s.id + s.k} it={s} showPrice={showPrice} />)}
      </div>
    </>
  );
}

function LabelCard({ it, showPrice }: { it: It; showPrice: boolean }) {
  return (
    <div className="label-card">
      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.4 }}>شغلات بنات</span>
      <span style={{ fontSize: 11, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{it.name} {it.label && `· ${it.label}`}</span>
      <Barcode value={it.code} />
      <span className="ltr" style={{ fontSize: 10, letterSpacing: 1, lineHeight: 1.4 }}>{it.code}</span>
      {showPrice && <b style={{ fontSize: 12, lineHeight: 1.4 }}>{price(it.price)}</b>}
    </div>
  );
}
