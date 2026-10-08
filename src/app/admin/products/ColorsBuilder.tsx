"use client";
import { useState } from "react";

/** ألوان جاهزة: الضغط على اللون يملأ الاسم ودرجة اللون تلقائياً */
const PRESETS: [string, string][] = [
  ["أسود", "#1F1A1C"], ["أبيض", "#FFFFFF"], ["كريمي", "#F3E9D2"], ["بيج", "#D9C3A5"], ["بني", "#6B4226"], ["رمادي", "#9A9A9A"],
  ["كحلي", "#1F2A44"], ["أزرق", "#2F6FB3"], ["سماوي", "#8EC5E8"], ["أخضر", "#2E7D4F"], ["زيتي", "#6B6B3A"], ["أحمر", "#B3122E"],
  ["نبيتي", "#6B1E2E"], ["وردي", "#F4A6C0"], ["فوشيا", "#D6037F"], ["بنفسجي", "#6E3A8E"], ["ذهبي", "#C9A227"], ["فضي", "#C0C0C0"],
];
const SIZE_TYPES: { key: string; label: string; sizes: string[] }[] = [
  { key: "clothes", label: "مقاسات ملابس", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
  { key: "numbers", label: "مقاسات بالأرقام", sizes: ["36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56"] },
  { key: "volume", label: "أحجام (مل)", sizes: ["30 مل", "50 مل", "75 مل", "100 مل", "150 مل"] },
  { key: "none", label: "بدون مقاس", sizes: [] },
];
const NO_COLOR = "";

type Color = { name: string; hex: string; sizes: Record<string, string> };

/**
 * إدخال المنتج بأبسط شكل: كم لون ← من كل لون كم مقاس ← من كل مقاس كم قطعة.
 * النتيجة تُرسل مع النموذج في حقل variants_json، والنظام يُنشئ رموز SKU والكميات تلقائياً.
 */
export function ColorsBuilder({ locations, title = "الألوان والمقاسات والكميات" }: { locations: { id: string; name: string; kind: string }[]; title?: string }) {
  const [colors, setColors] = useState<Color[]>([]);
  const [custom, setCustom] = useState<string>("");
  const defLoc = locations.find((l) => l.kind === "warehouse")?.id ?? locations[0]?.id ?? "";
  const [loc, setLoc] = useState(defLoc);
  const [withColors, setWithColors] = useState(true);
  const [sizeType, setSizeType] = useState("clothes");
  const [plainQty, setPlainQty] = useState("");          // بدون ألوان وبدون مقاس
  const [plainSizes, setPlainSizes] = useState<Record<string, string>>({}); // بدون ألوان مع مقاسات
  const [plainColorsQty, setPlainColorsQty] = useState<Record<string, string>>({}); // ألوان بدون مقاس
  const SIZES = SIZE_TYPES.find((x) => x.key === sizeType)!.sizes;
  const noSize = sizeType === "none";

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

  const n = (q: string) => Number(q) || 0;
  const payload = !withColors
    ? (noSize ? (plainQty !== "" ? [{ color: NO_COLOR, hex: "", sizes: [{ size: "", qty: n(plainQty) }] }] : [])
              : [{ color: NO_COLOR, hex: "", sizes: Object.entries(plainSizes).map(([size, qty]) => ({ size, qty: n(qty) })) }].filter((c) => c.sizes.length))
    : noSize
      ? colors.map((c) => ({ color: c.name, hex: c.hex, sizes: [{ size: "", qty: n(plainColorsQty[c.name] ?? "") }] }))
      : colors.map((c) => ({ color: c.name, hex: c.hex, sizes: Object.entries(c.sizes).map(([size, qty]) => ({ size, qty: n(qty) })) })).filter((c) => c.sizes.length);
  const total = payload.reduce((t, c) => t + c.sizes.reduce((a, x) => a + x.qty, 0), 0);
  const seg = (on: boolean): React.CSSProperties => ({ height: 38, padding: "0 16px" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, borderRadius: 24, background: "var(--surface-admin)", border: "1px solid var(--border-soft)" }}>
      <input type="hidden" name="variants_json" value={JSON.stringify(payload)} />
      <input type="hidden" name="stock_location" value={loc} />
      <div className="row-between" style={{ flexWrap: "wrap" }}>
        <h2 className="adm-h2">{title}</h2>
        {total > 0 && <span className="pill tone-brand">{withColors ? `${colors.length} لون · ` : ""}{total} قطعة</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>هل للمنتج ألوان؟</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className={`a-chip${withColors ? " on" : ""}`} style={seg(withColors)} onClick={() => setWithColors(true)}>نعم، بألوان</button>
            <button type="button" className={`a-chip${!withColors ? " on" : ""}`} style={seg(!withColors)} onClick={() => setWithColors(false)}>منتج بلا ألوان</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>نوع المقاس</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SIZE_TYPES.map((t) => <button key={t.key} type="button" className={`a-chip${sizeType === t.key ? " on" : ""}`} style={seg(sizeType === t.key)} onClick={() => setSizeType(t.key)}>{t.label}</button>)}
          </div>
        </div>
      </div>

      {!withColors && noSize && (
        <label className="a-field" style={{ maxWidth: 220 }}>كم قطعة؟
          <input className="a-in" type="number" min="0" inputMode="numeric" placeholder="العدد" value={plainQty} onChange={(e) => setPlainQty(e.target.value)} style={{ textAlign: "center" }} />
        </label>
      )}
      {!withColors && !noSize && (
        <div style={{ background: "#fff", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--border-soft)" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>اختر المقاسات واكتب عدد القطع</span>
          <SizePicker sizes={SIZES} value={plainSizes} onChange={setPlainSizes} />
        </div>
      )}
      {withColors && (<>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>اختر ألوان المنتج</span>
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

      {colors.length > 0 && <span style={{ fontSize: 14, fontWeight: 600 }}>{noSize ? "اكتب عدد القطع من كل لون" : "لكل لون: اختر المقاسات واكتب عدد القطع"}</span>}
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
          {noSize
            ? <input className="a-in" type="number" min="0" inputMode="numeric" placeholder="عدد القطع" value={plainColorsQty[c.name] ?? ""} onChange={(e) => setPlainColorsQty((x) => ({ ...x, [c.name]: e.target.value }))} style={{ maxWidth: 180, textAlign: "center" }} aria-label={`عدد القطع ${c.name}`} />
            : <SizePicker sizes={SIZES} value={c.sizes} onChange={(sizes) => upd(i, (x) => ({ ...x, sizes }))} />}
        </div>
      ))}

      </>)}
      {total > 0 && locations.length > 1 && (
        <label className="a-field" style={{ maxWidth: 280 }}>أين توجد هذه القطع؟
          <select className="a-in" value={loc} onChange={(e) => setLoc(e.target.value)}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        </label>
      )}
    </div>
  );
}

/** اختيار المقاسات بالضغط + خانة عدد لكل مقاس مختار + إضافة مقاس غير موجود */
function SizePicker({ sizes, value, onChange }: { sizes: string[]; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const [extra, setExtra] = useState("");
  const all = [...sizes, ...Object.keys(value).filter((s) => !sizes.includes(s))];
  const toggle = (s: string) => { const v = { ...value }; if (s in v) delete v[s]; else v[s] = ""; onChange(v); };
  const addExtra = () => { const v = extra.trim(); if (v && !(v in value)) onChange({ ...value, [v]: "" }); setExtra(""); };
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {all.map((s) => <button key={s} type="button" onClick={() => toggle(s)} className={`a-chip${s in value ? " on" : ""}`} style={{ height: 34, padding: "0 12px" }}>{s}</button>)}
        <input className="a-in" style={{ width: 130, height: 34 }} placeholder="مقاس آخر…" value={extra} onChange={(e) => setExtra(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtra(); } }} onBlur={addExtra} />
      </div>
      {Object.keys(value).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {Object.entries(value).map(([s, q]) => (
            <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 6px", borderRadius: 14, background: "var(--light-blush)" }}>
              <span style={{ minWidth: 38, fontSize: 13, fontWeight: 700, textAlign: "center", color: "var(--deep-berry)", lineHeight: 1.4 }}>{s}</span>
              <input className="a-in" type="number" min="0" inputMode="numeric" placeholder="العدد" value={q} onChange={(e) => onChange({ ...value, [s]: e.target.value })} style={{ height: 36, flex: 1, minWidth: 0, textAlign: "center", background: "#fff" }} aria-label={`عدد القطع ${s}`} />
            </label>
          ))}
        </div>
      )}
    </>
  );
}
