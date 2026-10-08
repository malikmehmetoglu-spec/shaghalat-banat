"use client";
import { useActionState, useState, useTransition } from "react";
import { addVariant, deleteVariant, setStock, type ActionResult } from "../../actions";
import { Icon } from "@/components/Icon";

type V = { id: string; sku: string; barcode: string | null; size: string | null; color_name: string | null; color_hex: string | null; stock_levels: { location_id: string; on_hand: number; reserved: number }[] };
type L = { id: string; name: string };

export function VariantsEditor({ productId, slug, variants, locations }: { productId: string; slug: string; variants: V[]; locations: L[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addVariant, null);
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [busy, start] = useTransition();
  const qtyAt = (v: V, loc: string) => v.stock_levels.find((s) => s.location_id === loc)?.on_hand ?? 0;
  const suggestSku = `${slug.toUpperCase().slice(0, 14)}-${variants.length + 1}`;

  return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 className="adm-h2">المتغيرات والمخزون</h2>
      <span className="caption">عدّلي الكمية واضغطي خارج الحقل لحفظها. كل تعديل يُسجَّل في حركات المخزون.</span>
      {variants.length === 0 && <span className="caption">لا توجد متغيرات بعد — أضيفي أول مقاس/لون بالأسفل.</span>}
      {variants.map((v) => (
        <div key={v.id} style={{ padding: 12, borderRadius: 16, border: "1px solid var(--border-row)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="row-between">
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
              {v.color_hex && <span style={{ width: 16, height: 16, borderRadius: "50%", background: v.color_hex, border: "1px solid rgba(0,0,0,.08)" }} />}
              {[v.size, v.color_name].filter(Boolean).join(" · ") || "مقاس واحد"}
            </span>
            <button type="button" aria-label="حذف المتغير" disabled={busy} onClick={() => confirm("حذف هذا المتغير؟") && start(async () => setMsg(await deleteVariant(v.id, productId)))}
              style={{ width: 32, height: 32, padding: 0, borderRadius: "50%", border: "none", background: "var(--light-blush)", color: "var(--deep-berry)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="trash" size={14} stroke={2} />
            </button>
          </div>
          <span className="caption ltr" style={{ textAlign: "right" }}>{v.sku}{v.barcode ? ` · ${v.barcode}` : ""}</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {locations.map((l) => (
              <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                {l.name}
                <input type="number" min={0} className="cnt-in" defaultValue={qtyAt(v, l.id)} aria-label={`الكمية في ${l.name}`}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (n !== qtyAt(v, l.id) && n >= 0) start(async () => setMsg(await setStock(v.id, l.id, n, "adjust", "تعديل من صفحة المنتج")));
                  }} />
              </label>
            ))}
          </div>
        </div>
      ))}
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}

      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>إضافة متغير</span>
        <input type="hidden" name="product_id" value={productId} />
        <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
          <label className="a-field">المقاس<input name="size" className="a-in" placeholder="M" /></label>
          <label className="a-field">اسم اللون<input name="color_name" className="a-in" placeholder="توتي" /></label>
          <label className="a-field">لون (HEX)<input name="color_hex" className="a-in ltr" placeholder="#8E0254" /></label>
          <label className="a-field">SKU<input name="sku" className="a-in ltr" defaultValue={suggestSku} key={suggestSku} /></label>
        </div>
        <label className="a-field">الباركود (اتركه فارغاً ليتولّد تلقائياً)<input name="barcode" className="a-in ltr" /></label>
        {state && <span className={`a-flash ${state.ok ? "tone-success" : "tone-danger"}`}>{state.message}</span>}
        <button type="submit" className="btn" disabled={pending} style={{ alignSelf: "flex-start" }}>{pending ? "جارٍ الإضافة…" : "إضافة المتغير"}</button>
      </form>
    </div>
  );
}
