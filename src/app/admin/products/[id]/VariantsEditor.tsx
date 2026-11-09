"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStock, deleteVariant, deleteVariantGroup, quickAddVariant, setStock, updateVariant, type ActionResult } from "../../actions";
import { Icon } from "@/components/Icon";

type V = { id: string; sku: string; barcode: string | null; size: string | null; color_name: string | null; color_hex: string | null; stock_levels: { location_id: string; on_hand: number; reserved: number }[] };
type L = { id: string; name: string };
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54"];
const SWATCHES = ["#000000", "#FFFFFF", "#F5E6D3", "#C8A27A", "#8B5A2B", "#E85FA8", "#D6037F", "#8E0254", "#C1121F", "#F4A3B4", "#7B2CBF", "#1D4ED8", "#87CEEB", "#2D6A4F", "#9CA3AF", "#D4AF37"];

/**
 * محرّر الألوان والمقاسات والكميات — كل شيء قابل للتعديل مباشرة:
 * اسم اللون ولونه، المقاس، الكمية (− / +) في كل موقع، حذف لون أو مقاس أو سطر، وإضافة سطر جديد.
 */
export function VariantsEditor({ productId, variants, locations }: { productId: string; slug?: string; variants: V[]; locations: L[] }) {
  const router = useRouter();
  const [msg, setMsgRaw] = useState<ActionResult | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, refresh = true) => start(async () => { const r = await fn(); setMsgRaw(r); if (r.ok && refresh) router.refresh(); });
  const [qty, setQty] = useState<Record<string, number>>({});
  const qtyAt = (v: V, loc: string) => qty[`${v.id}:${loc}`] ?? v.stock_levels.find((s) => s.location_id === loc)?.on_hand ?? 0;
  const total = variants.reduce((t, v) => t + locations.reduce((a, l) => a + qtyAt(v, l.id), 0), 0);
  const colors = useMemo(() => [...new Set(variants.map((v) => v.color_name ?? ""))], [variants]);
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size ?? ""))].filter(Boolean), [variants]);
  const [recv, setRecv] = useState<{ id: string; qty: string; loc: string; paid: string } | null>(null);
  const [nv, setNv] = useState({ color_name: "", color_hex: "#D6037F", size: "", qty: "", loc: locations.find((l) => /متجر|محل/.test(l.name))?.id ?? locations[0]?.id ?? "" });

  function setQ(v: V, loc: string, n: number) {
    n = Math.max(0, Math.floor(n || 0));
    const prev = qtyAt(v, loc);
    if (n === prev) return;
    setQty((m) => ({ ...m, [`${v.id}:${loc}`]: n }));
    start(async () => {
      const r = await setStock(v.id, loc, n, "adjust", "تعديل من صفحة المنتج");
      if (!r.ok) { setQty((m) => ({ ...m, [`${v.id}:${loc}`]: prev })); setMsgRaw(r); }
    });
  }
  const confirmDel = (text: string, fn: () => Promise<ActionResult>) => { if (confirm(text)) run(fn); };

  return (
    <div className="acard ve">
      <div className="ve-head">
        <div className="title-block" style={{ gap: 4 }}>
          <h2 className="adm-h2">الألوان والمقاسات والكميات</h2>
          <span className="caption">عدّل أي خانة مباشرة — تُحفظ تلقائياً. استخدم − و + لتغيير الكمية.</span>
        </div>
        <span className="pill tone-brand">المجموع: {total} قطعة</span>
      </div>

      {(colors.filter(Boolean).length > 1 || sizes.length > 1) && (
        <div className="ve-groups">
          {colors.filter(Boolean).length > 0 && <div className="ve-gl"><span>حذف لون كامل:</span>{colors.filter(Boolean).map((c) => (
            <button key={c} type="button" className="ve-chip" disabled={busy} onClick={() => confirmDel(`حذف اللون «${c}» بكل مقاساته؟`, () => deleteVariantGroup(productId, "color", c))}>{c} <Icon name="trash" size={12} stroke={2} /></button>
          ))}</div>}
          {sizes.length > 0 && <div className="ve-gl"><span>حذف مقاس من كل الألوان:</span>{sizes.map((s) => (
            <button key={s} type="button" className="ve-chip ltr" disabled={busy} onClick={() => confirmDel(`حذف المقاس «${s}» من كل الألوان؟`, () => deleteVariantGroup(productId, "size", s))}>{s} <Icon name="trash" size={12} stroke={2} /></button>
          ))}</div>}
        </div>
      )}

      <div className="tw"><table className="tbl ve-tbl">
        <thead><tr><th>اللون</th><th>المقاس</th>{locations.map((l) => <th key={l.id} style={{ textAlign: "center" }}>{l.name}</th>)}<th></th></tr></thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id}>
              <td>
                <span className="ve-color">
                  <label className="ve-sw" style={{ background: v.color_hex ?? "#fff" }} title="تغيير لون العرض">
                    <input type="color" defaultValue={v.color_hex ?? "#ffffff"} onBlur={(e) => e.target.value !== (v.color_hex ?? "") && run(() => updateVariant(v.id, productId, { color_hex: e.target.value }), false)} />
                  </label>
                  <input className="a-in ve-in" defaultValue={v.color_name ?? ""} placeholder="بدون لون" onBlur={(e) => e.target.value.trim() !== (v.color_name ?? "") && run(() => updateVariant(v.id, productId, { color_name: e.target.value }))} />
                </span>
                <span className="caption ltr ve-bc">{v.barcode ?? v.sku}</span>
              </td>
              <td><input className="a-in ve-in ve-size ltr" list="ve-sizes" defaultValue={v.size ?? ""} placeholder="—" onBlur={(e) => e.target.value.trim() !== (v.size ?? "") && run(() => updateVariant(v.id, productId, { size: e.target.value }))} /></td>
              {locations.map((l) => (
                <td key={l.id}>
                  <span className="ve-step">
                    <button type="button" onClick={() => setQ(v, l.id, qtyAt(v, l.id) - 1)} disabled={qtyAt(v, l.id) <= 0} aria-label="إنقاص">−</button>
                    <input type="number" min={0} key={qtyAt(v, l.id)} defaultValue={qtyAt(v, l.id)} onBlur={(e) => setQ(v, l.id, Number(e.target.value))} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} aria-label={`الكمية في ${l.name}`} />
                    <button type="button" onClick={() => setQ(v, l.id, qtyAt(v, l.id) + 1)} aria-label="زيادة">+</button>
                  </span>
                </td>
              ))}
              <td>
                <span className="ve-acts">
                  <button type="button" className="btn soft ve-recv" onClick={() => setRecv(recv?.id === v.id ? null : { id: v.id, qty: "", loc: nv.loc, paid: "none" })} title="بضاعة وصلت (تُسجَّل كمشتريات)">استلام بضاعة</button>
                  <button type="button" className="ve-del" disabled={busy} aria-label="حذف هذا السطر" title="حذف هذا اللون/المقاس"
                    onClick={() => confirmDel(`حذف «${[v.color_name, v.size].filter(Boolean).join(" · ") || "هذا السطر"}»؟`, () => deleteVariant(v.id, productId))}><Icon name="trash" size={15} stroke={2} /></button>
                </span>
                {recv?.id === v.id && (
                  <span className="ve-recv-box">
                    <input className="a-in" type="number" min="1" autoFocus placeholder="العدد" value={recv.qty} onChange={(e) => setRecv({ ...recv, qty: e.target.value })} />
                    {locations.length > 1 && <select className="a-in" value={recv.loc} onChange={(e) => setRecv({ ...recv, loc: e.target.value })}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
                    <select className="a-in" value={recv.paid} onChange={(e) => setRecv({ ...recv, paid: e.target.value })} aria-label="ثمنها دُفع من">
                      <option value="none">لم يُدفع الآن</option><option value="1110">من صندوق المحل</option><option value="1120">من شام كاش</option><option value="3100">من المال الخاص</option>
                    </select>
                    <button type="button" className="btn" disabled={busy || !(Number(recv.qty) > 0)} onClick={() => run(async () => { const r = await addStock(v.id, recv.loc, Number(recv.qty), recv.paid); if (r.ok) setRecv(null); return r; })}>حفظ</button>
                  </span>
                )}
              </td>
            </tr>
          ))}
          <tr className="ve-new">
            <td>
              <span className="ve-color">
                <label className="ve-sw" style={{ background: nv.color_hex }}><input type="color" value={nv.color_hex} onChange={(e) => setNv({ ...nv, color_hex: e.target.value })} /></label>
                <input className="a-in ve-in" list="ve-colors" value={nv.color_name} onChange={(e) => setNv({ ...nv, color_name: e.target.value })} placeholder="لون جديد" />
              </span>
              <span className="ve-swatches">{SWATCHES.map((c) => <button key={c} type="button" style={{ background: c }} onClick={() => setNv({ ...nv, color_hex: c })} aria-label={c} />)}</span>
            </td>
            <td><input className="a-in ve-in ve-size ltr" list="ve-sizes" value={nv.size} onChange={(e) => setNv({ ...nv, size: e.target.value })} placeholder="مقاس" /></td>
            <td colSpan={locations.length}>
              <span className="ve-newq">
                <input className="a-in" type="number" min="0" value={nv.qty} onChange={(e) => setNv({ ...nv, qty: e.target.value })} placeholder="الكمية" />
                {locations.length > 1 && <select className="a-in" value={nv.loc} onChange={(e) => setNv({ ...nv, loc: e.target.value })}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
              </span>
            </td>
            <td>
              <button type="button" className="btn" disabled={busy || !(nv.color_name.trim() || nv.size.trim())}
                onClick={() => run(async () => { const r = await quickAddVariant(productId, { ...nv, qty: Number(nv.qty) || 0 }); if (r.ok) setNv((x) => ({ ...x, size: "", qty: "" })); return r; })}>+ إضافة</button>
            </td>
          </tr>
        </tbody>
      </table></div>
      <datalist id="ve-sizes">{SIZES.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="ve-colors">{colors.filter(Boolean).map((c) => <option key={c} value={c} />)}</datalist>
      <span className="caption">لإضافة مقاس لنفس اللون: اكتب اسم اللون نفسه في السطر الأخير مع المقاس الجديد. «استلام بضاعة» يسجّل القطع كمشتريات في المالية، أما − و + فهي تصحيح للعدد فقط.</span>
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
    </div>
  );
}
