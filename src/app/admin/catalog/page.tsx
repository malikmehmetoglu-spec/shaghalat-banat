import { requireStaff } from "@/lib/admin";
import { placeholder } from "@/lib/format";
import { FormCard } from "../FormCard";
import { saveBanner, saveCategory } from "../actions";
import { BannerControls, CategoryToggle } from "./Controls";

export const metadata = { title: "الأقسام والبانرات" };

export default async function CatalogPage() {
  const { sb } = await requireStaff();
  const [{ data: cats }, { data: banners }] = await Promise.all([
    sb.from("categories").select("id,name,slug,image_url,is_visible,sort_order,products(count)").order("sort_order"),
    sb.from("banners").select("id,kicker,title,link,image_url,is_active,sort_order").order("sort_order"),
  ]);

  return (
    <>
      <div className="adm-top">
        <div className="title-block"><h1 className="adm-h1">الأقسام والبانرات</h1><span className="adm-sub">ما يظهر في الصفحة الرئيسية وصفحة الأقسام في التطبيق</span></div>
      </div>
      <div className="split">
        <div className="narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 className="adm-h2">الأقسام</h2>
            {(cats ?? []).map((c: any) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 18, border: "1px solid var(--border-row)" }}>
                <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", background: c.image_url ? `url(${c.image_url}) center/cover` : placeholder(c.slug) }} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{c.name}</span>
                  <span className="caption">{c.products?.[0]?.count ?? 0} منتج · ترتيب {c.sort_order}{c.is_visible ? "" : " · مخفي"}</span>
                </span>
                <CategoryToggle id={c.id} visible={c.is_visible} />
              </div>
            ))}
          </div>
          <FormCard title="قسم جديد" action={saveCategory} submitLabel="إضافة القسم">
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">الاسم<input name="name" className="a-in" required /></label>
              <label className="a-field">الاسم بالإنجليزية<input name="name_en" className="a-in ltr" /></label>
              <label className="a-field">الترتيب<input name="sort_order" type="number" className="a-in" defaultValue={99} /></label>
              <label className="a-field">رابط مختصر<input name="slug" className="a-in ltr" placeholder="dresses" /></label>
            </div>
            <label className="a-field">رابط الصورة (اختياري)<input name="image_url" className="a-in ltr" placeholder="https://..." /></label>
          </FormCard>
        </div>

        <div className="wide" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 className="adm-h2">بانرات الصفحة الرئيسية</h2>
            <span className="caption">يظهر في التطبيق أول بانر نشط حسب الترتيب.</span>
            {(banners ?? []).map((b) => (
              <div key={b.id} style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 14, borderRadius: 20, border: "1px solid var(--border-row)" }}>
                <div style={{ flex: "1 1 240px", minHeight: 110, borderRadius: 18, background: b.image_url ? `url(${b.image_url}) center/cover` : "linear-gradient(135deg,var(--deep-berry),var(--magenta))", padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, color: "#fff" }}>
                  {b.kicker && <span style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.9 }}>{b.kicker}</span>}
                  <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{b.title}</span>
                </div>
                <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className={`pill ${b.is_active ? "tone-success" : "tone-neutral"}`} style={{ alignSelf: "flex-start" }}>{b.is_active ? "نشط" : "متوقف"}</span>
                    <span className="caption">يفتح: <span className="ltr">{b.link || "—"}</span> · ترتيب {b.sort_order}</span>
                  </div>
                  <BannerControls id={b.id} active={b.is_active} />
                </div>
              </div>
            ))}
          </div>
          <FormCard title="بانر جديد" action={saveBanner} submitLabel="إضافة البانر">
            <div className="a-grid">
              <label className="a-field">العنوان<input name="title" className="a-in" required placeholder="خصم حتى 30% على العبايات" /></label>
              <label className="a-field">نص صغير فوق العنوان<input name="kicker" className="a-in" placeholder="عرض الموسم" /></label>
              <label className="a-field">يفتح عند الضغط<input name="link" className="a-in ltr" placeholder="/c/abayas" /></label>
              <label className="a-field">الترتيب<input name="sort_order" type="number" className="a-in" defaultValue={0} /></label>
            </div>
            <label className="a-field">رابط الصورة (اختياري)<input name="image_url" className="a-in ltr" placeholder="https://..." /></label>
          </FormCard>
        </div>
      </div>
    </>
  );
}
