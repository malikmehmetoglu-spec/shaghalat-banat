"use client";
import { useState } from "react";

/** ألوان جاهزة: الضغط على اللون يملأ الاسم ودرجة اللون تلقائياً */
const PRESETS: [string, string][] = [
  ["أسود", "#1F1A1C"], ["أبيض", "#FFFFFF"], ["كريمي", "#F3E9D2"], ["بيج", "#D9C3A5"], ["بني", "#6B4226"], ["رمادي", "#9A9A9A"],
  ["كحلي", "#1F2A44"], ["أزرق", "#2F6FB3"], ["سماوي", "#8EC5E8"], ["أخضر", "#2E7D4F"], ["زيتي", "#6B6B3A"], ["أحمر", "#B3122E"],
  ["نبيتي", "#6B1E2E"], ["وردي", "#F4A6C0"], ["فوشيا", "#D6037F"], ["بنفسجي", "#6E3A8E"], ["ذهبي", "#C9A227"], ["فضي", "#C0C0C0"],
];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "مقاس واحد"];

type Color = { name: string; hex: string; sizes: Record<string, string> };

/**
 * إدخال المنتج بأبسط شكل: كم لون ← من كل لون كم مقاس ← من كل مقاس كم قطعة.
 * النتيجة تُرسل مع النموذج في حقل variants_json، والنظام يُنشئ رموز SKU والكميات تلقائياً.
 */
export function ColorsBuilder({ locations, title = "الألوان والمقاسات والكميات" }: { locations: { id: string; name: string; kind: string }[]; title?: string }) {
  const [colors, setColors] = useState<Color[]>([]);
  const [custom, setCustom] = useState<string>("");
  const [extraSize, setExtraSize] = useState<Record<number, string>>({});
  const defLoc = locations.find((l) => l.kind === "warehouse")?.id ?? locations[0]?.id ?? "";
  const [loc, setLoc] = useState(defLoc);

  const addColor = (name: string, hex: string) => {
    if (!name.trim() || colors.some((c) => c.name === name.trim())) return;
    setColors((cs) => [...cs, { name: name.trim(), hex, sizes: {} }]);
  };
  const upd = (i: number, fn: (c: Color) => Color) => setColors((cs) => cs.map((c, j) => (j === i ? fn(c) : c)));
  const toggleSize = (i: number, s: string) => upd(i, (c) => {
    const sizes = { ...c.sizes };
    if (s in sizes) delete sizes[s]; else sizes[s] = "";
    return { ...c, sizes };
  });

  const total = colors.reduce((t, c) => t + Object.values(c.sizes).reduce((a, q) => a + (Number(q) || 0), 0), 0);
  const payload = colors.map((c) => ({ color: c.name, hex: c.hex, sizes: Object.entries(c.sizes).map(([size, qty]) => ({ size, qty: Number(qty) || 0 })) })).filter((c) => c.sizes.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, borderRadius: 24, background: "var(--surface-admin)", border: "1px solid var(--border-soft)" }}>
      <input type="hidden" name="variants_json" value={JSON.stringify(payload)} />
      <input type="hidden" name="stock_location" value={loc} />
      <div className="row-between" style={{ flexWrap: "wrap" }}>
        <h2 className="adm-h2">{title}</h2>
        {total > 0 && <span className="pill tone-brand">{colors.length} لون · {total} قطعة</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>1. اختر ألوان المنتج</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PRESETS.map(([n, h]) => {
            const on = colors.some((c) => c.name === n);
            return (
              <button key={n} type="button" onClick={() => (on ? setColors((cs) => cs.filter((c) => c.name !== n)) : addColor(n, h))}
                className={`a-chip${on ? " on" : ""}`} style={{ height: 36, padding: "0 12px 0 10px", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 8, background: h, border: "1px solid rgba(0,0,0,.15)", flexShrink: 0 }} />{n}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input className="a-in" style={{ maxWidth: 200 }} placeholder="لون آخر… مثل: موف" value={custom} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColor(custom, "#C9A6B8"); setCustom(""); } }} />
          <button type="button" className="btn soft" onClick={() => { addColor(custom, "#C9A6B8"); setCustom(""); }}>+ إضافة اللون</button>
        </div>
      </div>

      {colors.length > 0 && <span style={{ fontSize: 14, fontWeight: 600 }}>2. لكل لون: اختر المقاسات واكتب عدد القطع</span>}
      {colors.map((c, i) => (
        <div key={c.name} style={{ background: "#fff", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--border-soft)" }}>
          <div className="row-between">
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label title="تعديل درجة اللون" style={{ position: "relative", width: 30, height: 30, borderRadius: 15, background: c.hex, border: "2px solid #fff", boxShadow: "0 0 0 1px var(--rosy-gray)", cursor: "pointer", flexShrink: 0 }}>
                <input type="color" value={c.hex} onChange={(e) => upd(i, (x) => ({ ...x, hex: e.target.value }))} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
              </label>
              <b style={{ fontSize: 15, lineHeight: 1.5 }}>{c.name}</b>
            </span>
            <button type="button" className="link-btn" onClick={() => setColors((cs) => cs.filter((_, j) => j !== i))}>حذف اللون</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...SIZES, ...Object.keys(c.sizes).filter((s) => !SIZES.includes(s))].map((s) => (
              <button key={s} type="button" onClick={() => toggleSize(i, s)} className={`a-chip${s in c.sizes ? " on" : ""}`} style={{ height: 34, padding: "0 12px" }}>{s}</button>
            ))}
            <input className="a-in" style={{ width: 120, height: 34 }} placeholder="مقاس آخر: 52" value={extraSize[i] ?? ""} onChange={(e) => setExtraSize((x) => ({ ...x, [i]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (extraSize[i] ?? "").trim(); if (v && !(v in c.sizes)) upd(i, (x) => ({ ...x, sizes: { ...x.sizes, [v]: "" } })); setExtraSize((x) => ({ ...x, [i]: "" })); } }} />
          </div>
          {Object.keys(c.sizes).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
              {Object.entries(c.sizes).map(([s, q]) => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 6px", borderRadius: 14, background: "var(--light-blush)" }}>
                  <span style={{ minWidth: 34, fontSize: 13, fontWeight: 700, textAlign: "center", color: "var(--deep-berry)" }}>{s}</span>
                  <input className="a-in" type="number" min="0" inputMode="numeric" placeholder="العدد" value={q} onChange={(e) => upd(i, (x) => ({ ...x, sizes: { ...x.sizes, [s]: e.target.value } }))} style={{ height: 36, flex: 1, minWidth: 0, textAlign: "center", background: "#fff" }} aria-label={`عدد القطع ${c.name} ${s}`} />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {colors.length > 0 && locations.length > 1 && (
        <label className="a-field" style={{ maxWidth: 280 }}>3. أين توجد هذه القطع؟
          <select className="a-in" value={loc} onChange={(e) => setLoc(e.target.value)}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        </label>
      )}
      {colors.length === 0 && <span className="caption">منتج بلا ألوان (مثل عطر)؟ اختر «أسود» أو أي لون وحدّد «مقاس واحد» ثم اكتب العدد — أو أضف لوناً باسم «افتراضي».</span>}
    </div>
  );
}
