import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { FormCard } from "../../FormCard";
import { saveSettings } from "../actions";

export const metadata = { title: "الضرائب والإعدادات" };
const _M = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default async function SettingsPage() {
  const { sb } = await requireStaff(FINANCE_ROLES);
  const { data: s } = await sb.from("finance_settings").select("*").eq("id", 1).single();
  if (!s) return null;

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الإعدادات المالية</h1><span className="adm-sub">الضريبة وبيانات الفاتورة</span></div></div>
      <div style={{ maxWidth: 820 }}>
        <FormCard title="الإعدادات" action={saveSettings} submitLabel="حفظ الإعدادات" resetOnSuccess={false}>
          <input type="hidden" name="currency" value={s.currency} />
          <input type="hidden" name="fiscal_start_month" value={s.fiscal_start_month} />
          <input type="hidden" name="inventory_method" value={s.inventory_method} />
          <input type="hidden" name="close_period" value={s.close_period} />
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>الضريبة</h3>
          <div className="a-grid">
            <label className="a-field">نسبة الضريبة %<input name="tax_rate" type="number" min="0" max="100" step="0.01" className="a-in" defaultValue={s.tax_rate} /></label>
            <label className="a-field">الرقم الضريبي<input name="tax_number" className="a-in ltr" defaultValue={s.tax_number ?? ""} /></label>
            <label className="a-field">الأسعار المعروضة للعميلات<select name="prices_include_tax" className="a-in" defaultValue={s.prices_include_tax ? "inclusive" : "exclusive"}><option value="inclusive">شاملة الضريبة</option><option value="exclusive">غير شاملة الضريبة</option></select></label>
          </div>
          <span className="caption">نسبة الضريبة 0 حالياً لحين وضوحها؛ عند تغييرها تظهر تلقائياً في الفواتير.</span>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>بيانات الفاتورة</h3>
          <div className="a-grid">
            <label className="a-field">عنوان المحل<input name="store_address" className="a-in" defaultValue={s.store_address ?? ""} placeholder="دمشق، …" /></label>
            <label className="a-field">هاتف المحل<input name="store_phone" className="a-in ltr" defaultValue={s.store_phone ?? ""} /></label>
          </div>
          <label className="a-field">تذييل الفاتورة<input name="invoice_footer" className="a-in" defaultValue={s.invoice_footer ?? ""} /></label>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>أين يذهب المال تلقائياً</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[["بيع نقدي في المحل", "صندوق المحل"], ["بطاقة أو تحويل", "الحساب البنكي"], ["الدفع عند الاستلام", "يبقى عند شركة التوصيل حتى تسلّمه لنا"]].map(([a, b]) => <div key={a} className="kv" style={{ fontSize: 13 }}><span>{a}</span><span className="adm-sub">{b}</span></div>)}
          </div>
          <span className="caption">كل بيع ومرتجع ومصروف وشراء بضاعة يُسجَّل في الحسابات تلقائياً — لا حاجة لأي إدخال محاسبي.</span>
        </FormCard>
      </div>
    </>
  );
}
