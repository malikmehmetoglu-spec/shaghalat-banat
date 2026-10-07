"use client";
import { useActionState } from "react";
import { saveProduct, type ActionResult } from "../actions";

type P = {
  id?: string; name?: string; name_en?: string | null; subtitle?: string | null; description?: string | null;
  price?: number; compare_at_price?: number | null; cost?: number | null; tag?: string | null; category_id?: string | null;
  images?: string[]; is_online?: boolean; is_in_store?: boolean;
};

export function ProductForm({ p = {}, categories }: { p?: P; categories: { id: string; name: string }[] }) {
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
        <label className="a-field">القسم
          <select name="category_id" className="a-in" defaultValue={p.category_id ?? ""}>
            <option value="">— بدون قسم —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <label className="a-field">الوصف<textarea name="description" className="a-in" defaultValue={p.description ?? ""} /></label>
      <div className="a-grid">
        <label className="a-field">السعر (ل.س)<input name="price" type="number" min="0" step="0.01" className="a-in" defaultValue={p.price ?? ""} required /></label>
        <label className="a-field">السعر قبل الخصم<input name="compare_at_price" type="number" min="0" step="0.01" className="a-in" defaultValue={p.compare_at_price ?? ""} placeholder="اختياري" /></label>
        <label className="a-field">سعر التكلفة<input name="cost" type="number" min="0" step="0.01" className="a-in" defaultValue={p.cost ?? ""} placeholder="للمحاسبة" /></label>
        <label className="a-field">شارة<input name="tag" className="a-in" defaultValue={p.tag ?? ""} placeholder="جديد، الأكثر مبيعاً…" /></label>
      </div>
      <label className="a-field">روابط الصور (رابط في كل سطر — الأول هو الرئيسي)
        <textarea name="images" className="a-in ltr" style={{ textAlign: "left", height: 84 }} defaultValue={(p.images ?? []).join("\n")} placeholder="https://..." />
        <span className="caption" style={{ fontWeight: 400 }}>رفع الصور مباشرة من الجهاز سيُضاف لاحقاً. حالياً يمكن رفعها إلى Supabase Storage ولصق الرابط.</span>
      </label>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><input type="checkbox" name="is_online" defaultChecked={p.is_online ?? true} style={{ width: 18, height: 18, accentColor: "var(--magenta)" }} /> ظاهر في المتجر الإلكتروني</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><input type="checkbox" name="is_in_store" defaultChecked={p.is_in_store ?? true} style={{ width: 18, height: 18, accentColor: "var(--magenta)" }} /> متوفر في المحل</label>
      </div>
      {state && <span className={`a-flash ${state.ok ? "tone-success" : "tone-danger"}`}>{state.message}</span>}
      <button type="submit" className="btn" disabled={pending} style={{ alignSelf: "flex-start", minWidth: 160 }}>{pending ? "جارٍ الحفظ…" : p.id ? "حفظ التغييرات" : "إنشاء المنتج"}</button>
    </form>
  );
}
