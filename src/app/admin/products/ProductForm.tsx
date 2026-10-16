"use client";
import { ImageUpload } from "../ImageUpload";
import { ColorsBuilder } from "./ColorsBuilder";
import { PriceFields } from "./PriceFields";
import { useActionState } from "react";
import { saveProduct, type ActionResult } from "../actions";

type P = {
  id?: string; name?: string; name_en?: string | null; subtitle?: string | null; description?: string | null;
  price?: number; compare_at_price?: number | null; cost?: number | null; tag?: string | null; category_id?: string | null; category_ids?: string[];
  images?: string[]; is_online?: boolean; is_in_store?: boolean;
  product_variants?: { size: string | null; color_name: string | null }[];
  currency?: string; price_usd?: number | null; compare_usd?: number | null; cost_usd?: number | null;
};

export function ProductForm({ p = {}, categories, locations = [], rate }: { p?: P; categories: { id: string; name: string }[]; locations?: { id: string; name: string; kind: string }[]; rate: number }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveProduct, null);
  return (
    <form action={action} className="acard" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <h2 className="adm-h2">المعلومات الأساسية</h2>
      <div className="a-grid">
        <label className="a-field">اسم المنتج (عربي)<input name="name" className="a-in" defaultValue={p.name} required /></label>
        <label className="a-field">اسم المنتج (English)<input name="name_en" className="a-in ltr" style={{ textAlign: "left" }} defaultValue={p.name_en ?? ""} /></label>
      </div>
      <div className="a-grid">
        <label className="a-field">وصف مختصر (يظهر على البطاقة)<input name="subtitle" className="a-in" defaultValue={p.subtitle ?? ""} placeholder="مثال: كريب ملكي" /></label>
        <div className="a-field">الأقسام (يمكن اختيار أكثر من قسم)
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => (
              <label key={c.id} className="cat-chk">
                <input type="checkbox" name="category_ids" value={c.id} defaultChecked={(p.category_ids ?? (p.category_id ? [p.category_id] : [])).includes(c.id)} />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <label className="a-field">الوصف<textarea name="description" className="a-in" defaultValue={p.description ?? ""} /></label>
      <PriceFields rate={rate} p={p} />
      <div className="a-grid">
        <label className="a-field">شارة<input name="tag" className="a-in" defaultValue={p.tag ?? ""} placeholder="جديد، الأكثر مبيعاً…" /></label>
      </div>
      <ImageUpload name="images" folder="products" multiple label="صور المنتج" initial={p.images ?? []} />
      <ColorsBuilder key={state?.message ?? "c"} locations={locations} existing={p.product_variants ?? []} title={p.id ? "إضافة ألوان أو كميات جديدة" : "الألوان والمقاسات والكميات"} />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><input type="checkbox" name="is_online" defaultChecked={p.is_online ?? true} style={{ width: 18, height: 18, accentColor: "var(--magenta)" }} /> ظاهر في المتجر الإلكتروني</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><input type="checkbox" name="is_in_store" defaultChecked={p.is_in_store ?? true} style={{ width: 18, height: 18, accentColor: "var(--magenta)" }} /> متوفر في المحل</label>
      </div>
      {state && <span className={`a-flash ${state.ok ? "tone-success" : "tone-danger"}`}>{state.message}</span>}
      <button type="submit" className="btn" disabled={pending} style={{ width: "100%", minHeight: 52, fontSize: 16 }}>{pending ? "جارٍ الحفظ…" : "حفظ المنتج"}</button>
    </form>
  );
}
