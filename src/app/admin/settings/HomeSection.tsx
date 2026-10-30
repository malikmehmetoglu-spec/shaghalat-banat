import { requireStaff } from "@/lib/admin";
import { homeSettings } from "@/lib/homeSettings";
import { FormCard } from "../FormCard";
import { ImageUpload } from "../ImageUpload";
import { saveHomeSettings } from "../actions";

const TONES = [["magenta", "فوشيا", "#D6037F"], ["berry", "توتي غامق", "#8E0254"], ["plum", "برقوقي", "#3A2A30"], ["blush", "وردي فاتح", "#F8CFE0"]] as const;

/** «الصفحة الرئيسية»: إدارة قسم عروض اليوم وبانر التشكيلة المختارة */
export async function HomeSection() {
  const { sb } = await requireStaff("/admin/settings");
  const [{ data: prof }, { data: cats }, { count: onSale }] = await Promise.all([
    sb.from("store_profile").select("home,welcome_percent").eq("id", 1).maybeSingle(),
    sb.from("categories").select("slug,name").order("sort_order"),
    sb.from("products").select("id", { count: "exact", head: true }).is("archived_at", null).not("compare_at_price", "is", null),
  ]);
  const h = homeSettings(prof?.home);
  const endsLocal = h.deals_ends_at ? new Date(new Date(h.deals_ends_at).getTime() + 3 * 3600e3).toISOString().slice(0, 16) : "";
  return (
    <div style={{ maxWidth: 900 }}>
      <FormCard title="أقسام الصفحة الرئيسية" action={saveHomeSettings} submitLabel="حفظ" resetOnSuccess={false}>
        <div className="hs-block">
          <div className="hs-head">
            <div><h3>🔥 عروض اليوم</h3><span className="caption">تظهر تلقائياً المنتجات التي لها «سعر قبل الخصم» ({onSale ?? 0} منتجاً حالياً). أضيفي أو أزيلي الخصم من صفحة المنتج.</span></div>
            <label className="hs-sw"><input type="checkbox" name="deals_show" defaultChecked={h.deals_show} /> <span>إظهار القسم</span></label>
          </div>
          <div className="a-grid">
            <label className="a-field">العنوان<input name="deals_title" className="a-in" defaultValue={h.deals_title} placeholder="عروض اليوم" /></label>
            <label className="a-field">الجملة تحت العنوان<input name="deals_sub" className="a-in" defaultValue={h.deals_sub} placeholder="تلقائي: خصومات حتى 50% لفترة محدودة" /></label>
            <label className="a-field">ينتهي العرض في (بتوقيت دمشق)
              <input name="deals_ends_at" type="datetime-local" className="a-in ltr" defaultValue={endsLocal} />
              <span className="caption">اتركيه فارغاً ليعدّ العدّاد حتى منتصف كل ليلة. عند انتهاء الموعد يختفي القسم تلقائياً.</span>
            </label>
            <label className="a-field">عدد المنتجات المعروضة<input name="deals_limit" type="number" min={4} max={20} className="a-in ltr" defaultValue={h.deals_limit} /></label>
          </div>
        </div>

        <div className="hs-block">
          <div className="hs-head"><div><h3>🎁 هدية إنشاء الحساب</h3><span className="caption">كود خصم خاص بكل زبونة، يصلها مرة واحدة عند إنشاء حسابها، صالح لطلب واحد خلال 30 يوماً. ضعي 0 لإيقاف الهدية.</span></div></div>
          <label className="a-field" style={{ maxWidth: 260 }}>نسبة الخصم %<input name="welcome_percent" type="number" min={0} max={50} className="a-in ltr" defaultValue={prof?.welcome_percent ?? 10} /></label>
        </div>

        <div className="hs-block">
          <div className="hs-head">
            <div><h3>✨ بانر التشكيلة المختارة</h3><span className="caption">البانر الكبير الذي يدعو لاكتشاف قسم معيّن. الحقول الفارغة تُملأ تلقائياً من القسم.</span></div>
            <label className="hs-sw"><input type="checkbox" name="collect_show" defaultChecked={h.collect_show} /> <span>إظهار البانر</span></label>
          </div>
          <div className="a-grid">
            <label className="a-field">القسم
              <select name="collect_category" className="a-in" defaultValue={h.collect_category}>
                <option value="">تلقائي (القسم الأغنى بالمنتجات)</option>
                {(cats ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </label>
            <label className="a-field">العبارة الصغيرة أعلى العنوان<input name="collect_kicker" className="a-in" defaultValue={h.collect_kicker} placeholder="تشكيلة مختارة" /></label>
            <label className="a-field">العنوان<input name="collect_title" className="a-in" defaultValue={h.collect_title} placeholder="تلقائي: عالم + اسم القسم" /></label>
            <label className="a-field">الوصف<input name="collect_sub" className="a-in" defaultValue={h.collect_sub} placeholder="تلقائي: عدد القطع بانتظاركِ" /></label>
            <label className="a-field">نص الزر<input name="collect_cta" className="a-in" defaultValue={h.collect_cta} placeholder="اكتشفي التشكيلة" /></label>
          </div>
          <div className="a-field">لون البانر
            <div className="hs-tones">
              {TONES.map(([k, t, c]) => (
                <label key={k} className="hs-tone"><input type="radio" name="collect_tone" value={k} defaultChecked={h.collect_tone === k} /><i style={{ background: c }} /><span>{t}</span></label>
              ))}
            </div>
          </div>
          <ImageUpload name="collect_image" folder="banners" label="صورة البانر (اختياري — وإلا تُستخدم صورة القسم)" ratio="3 / 4" initial={h.collect_image ? [h.collect_image] : []} />
        </div>
      </FormCard>
    </div>
  );
}
