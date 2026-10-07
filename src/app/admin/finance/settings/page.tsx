import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { FormCard } from "../../FormCard";
import { saveSettings } from "../actions";

export const metadata = { title: "الضرائب والإعدادات" };
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default async function SettingsPage() {
  const { sb } = await requireStaff(FINANCE_ROLES);
  const { data: s } = await sb.from("finance_settings").select("*").eq("id", 1).single();
  if (!s) return null;

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الضرائب والإعدادات المالية</h1><span className="adm-sub">إعدادات تنطبق على الفواتير والتقارير ونقطة البيع</span></div></div>
      <div style={{ maxWidth: 820 }}>
        <FormCard title="الإعدادات" action={saveSettings} submitLabel="حفظ الإعدادات" resetOnSuccess={false}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>العملة والسنة المالية</h3>
          <div className="a-grid">
            <label className="a-field">العملة الأساسية<select name="currency" className="a-in" defaultValue={s.currency}><option value="SYP">ليرة سورية (ل.س)</option><option value="USD">دولار أمريكي ($)</option></select></label>
            <label className="a-field">بداية السنة المالية<select name="fiscal_start_month" className="a-in" defaultValue={s.fiscal_start_month}>{MONTHS.map((m, i) => <option key={i} value={i + 1}>1 {m}</option>)}</select></label>
            <label className="a-field">طريقة تقييم المخزون<select name="inventory_method" className="a-in" defaultValue={s.inventory_method}><option value="avg">متوسط التكلفة المرجّح</option><option value="fifo">الوارد أولاً صادر أولاً</option></select></label>
            <label className="a-field">إقفال الفترات<select name="close_period" className="a-in" defaultValue={s.close_period}><option value="monthly">شهري</option><option value="quarterly">ربع سنوي</option></select></label>
          </div>
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
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>ربط طرق الدفع بالحسابات</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[["نقداً في المحل", "صندوق المحل (1110)"], ["بطاقة / تحويل", "الحساب البنكي (1120)"], ["الدفع عند الاستلام", "ذمم شركة التوصيل (1130) حتى التحصيل"]].map(([a, b]) => <div key={a} className="kv" style={{ fontSize: 13 }}><span>{a}</span><span className="adm-sub">{b}</span></div>)}
          </div>
          <span className="caption">الأتمتة: يُرحَّل قيد المبيعات تلقائياً عند تسليم الطلب أو البيع في المحل، ويُعكس عند الإرجاع، وتُرحَّل المشتريات عند الاستلام.</span>
        </FormCard>
      </div>
    </>
  );
}
