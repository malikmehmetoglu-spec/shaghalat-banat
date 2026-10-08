"use client";
import { useState, useTransition } from "react";
import { deleteVariant, setStock, type ActionResult } from "../../actions";
import { Icon } from "@/components/Icon";

type V = { id: string; sku: string; barcode: string | null; size: string | null; color_name: string | null; color_hex: string | null; stock_levels: { location_id: string; on_hand: number; reserved: number }[] };
type L = { id: string; name: string };

/** الكميات الحالية لكل لون ومقاس، مع زر «+ إضافة قطع» سريع لكل واحد */
export function VariantsEditor({ productId, variants, locations }: { productId: string; slug?: string; variants: V[]; locations: L[] }) {
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [busy, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [fix, setFix] = useState(false);
  const [add, setAdd] = useState({ qty: "", loc: locations[0]?.id ?? "" });
  const qtyAt = (v: V, loc: string) => v.stock_levels.find((s) => s.location_id === loc)?.on_hand ?? 0;
  const total = variants.reduce((t, v) => t + v.stock_levels.reduce((a, s) => a + s.on_hand, 0), 0);

  return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="row-between" style={{ flexWrap: "wrap" }}>
        <div className="title-block" style={{ gap: 4 }}>
          <h2 className="adm-h2">الكميات الحالية</h2>
          <span className="caption">لإضافة بضاعة وصلت: اضغط «+ إضافة قطع» بجانب اللون والمقاس</span>
        </div>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="pill tone-brand">المجموع: {total} قطعة</span>
          <button type="button" className="link-btn" onClick={() => setFix((f) => !f)}>{fix ? "إنهاء التصحيح" : "تصحيح الأرقام"}</button>
        </span>
      </div>
      {variants.length === 0 && <span className="caption">لا توجد ألوان أو مقاسات بعد — أضفها من قسم «إضافة ألوان أو كميات جديدة» في الأسفل.</span>}
      {variants.length > 0 && (
        <div className="tw"><table className="tbl">
          <thead><tr><th>اللون والمقاس</th>{locations.map((l) => <th key={l.id} style={{ textAlign: "center" }}>{l.name}</th>)}<th></th></tr></thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id}>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                    {v.color_hex && <span style={{ width: 14, height: 14, borderRadius: 7, background: v.color_hex, border: "1px solid rgba(0,0,0,.12)", flexShrink: 0 }} />}
                    {[v.color_name, v.size].filter(Boolean).join(" · ") || "قطعة واحدة"}
                  </span>
                  <span className="caption ltr" style={{ display: "block", textAlign: "right" }}>{v.barcode ?? v.sku}</span>
                </td>
                {locations.map((l) => (
                  <td key={l.id} style={{ textAlign: "center" }}>
                    {fix
                      ? <input type="number" min={0} className="cnt-in" defaultValue={qtyAt(v, l.id)} aria-label={`الكمية في ${l.name}`}
                          onBlur={(e) => { const n = Number(e.target.value); if (n !== qtyAt(v, l.id) && n >= 0) start(async () => setMsg(await setStock(v.id, l.id, n, "adjust", "تصحيح من صفحة المنتج"))); }} />
                      : <b style={{ fontSize: 15 }}>{qtyAt(v, l.id)}</b>}
                  </td>
                ))}
                <td>
                  {open === v.id ? (
                    <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input className="a-in" type="number" min="1" autoFocus placeholder="العدد" value={add.qty} onChange={(e) => setAdd((a) => ({ ...a, qty: e.target.value }))} style={{ width: 80, height: 38, textAlign: "center" }} aria-label="عدد القطع الواردة" />
                      {locations.length > 1 && <select className="a-in" value={add.loc} onChange={(e) => setAdd((a) => ({ ...a, loc: e.target.value }))} style={{ height: 38, width: "auto" }}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
                      <button type="button" className="btn" style={{ minHeight: 38, padding: "0 14px" }} disabled={busy || !(Number(add.qty) > 0)}
                        onClick={() => start(async () => { const r = await setStock(v.id, add.loc, qtyAt(v, add.loc) + Number(add.qty), "in", "إضافة بضاعة"); setMsg(r.ok ? { ok: true, message: `تمت إضافة ${add.qty} قطعة` } : r); if (r.ok) { setOpen(null); setAdd((a) => ({ ...a, qty: "" })); } })}>حفظ</button>
                      <button type="button" className="link-btn" onClick={() => setOpen(null)}>إلغاء</button>
                    </span>
                  ) : (
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button type="button" className="btn soft" onClick={() => { setOpen(v.id); setAdd((a) => ({ ...a, qty: "" })); }}>+ إضافة قطع</button>
                      {fix && (
                        <button type="button" aria-label="حذف هذا اللون/المقاس" disabled={busy} onClick={() => confirm("حذف هذا اللون/المقاس من المنتج؟") && start(async () => setMsg(await deleteVariant(v.id, productId)))}
                          style={{ width: 34, height: 34, padding: 0, borderRadius: "50%", border: "none", background: "var(--light-blush)", color: "var(--deep-berry)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon name="trash" size={14} stroke={2} />
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {fix && <span className="caption">وضع التصحيح: اكتب الرقم الصحيح الكلي واضغط خارج الخانة. كل تعديل يُسجَّل في حركات المخزون.</span>}
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
    </div>
  );
}
