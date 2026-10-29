import { requireStaff } from "@/lib/admin";
import { rolesFor } from "@/lib/access";
import { FormCard } from "../FormCard";
import { saveStoreProfile } from "../actions";
import { ImageUpload } from "../ImageUpload";

export const metadata = { title: "إعدادات المتجر" };

export default async function StoreSettings() {
  const { sb } = await requireStaff(rolesFor("/admin/settings"));
  const { data: profileRow } = await sb.from("store_profile").select("whatsapp,facebook_url,instagram_url,tagline,shamcash_qr_url,shamcash_name").eq("id", 1).maybeSingle();
  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">إعدادات المتجر</h1><span className="adm-sub">أرقام التواصل وروابط الصفحات، وطريقة الدفع عبر شام كاش</span></div></div>
      <div style={{ maxWidth: 900 }}>
    <FormCard title="التواصل والدفع" action={saveStoreProfile} submitLabel="حفظ" resetOnSuccess={false}>
      <span className="caption">تظهر في صفحة <a href="/qr" target="_blank" className="ltr">shaghalat-banat.com/qr</a> التي يفتحها رمز QR المطبوع على الأكياس والكروت.</span>
      <div className="a-grid">
        <label className="a-field">رقم واتساب (مع رمز الدولة)<input name="whatsapp" className="a-in ltr" defaultValue={profileRow?.whatsapp ?? ""} placeholder="+963 9XX XXX XXX" /></label>
        <label className="a-field">رابط صفحة إنستغرام<input name="instagram_url" className="a-in ltr" defaultValue={profileRow?.instagram_url ?? ""} placeholder="instagram.com/..." /></label>
        <label className="a-field">رابط صفحة فيسبوك<input name="facebook_url" className="a-in ltr" defaultValue={profileRow?.facebook_url ?? ""} placeholder="facebook.com/..." /></label>
        <label className="a-field">الجملة تحت الشعار<input name="tagline" className="a-in" defaultValue={profileRow?.tagline ?? ""} /></label>
      </div>
      <span className="adm-h2" style={{ fontSize: 15, marginTop: 6 }}>الدفع عبر شام كاش</span>
      <span className="caption" style={{ lineHeight: 1.7 }}>يظهر الرمز للعميلة بعد تأكيد طلبها، ورقم الواتساب أعلاه تحته لإرسال إشعار التحويل.</span>
      <label className="a-field">اسم الحساب في شام كاش (اختياري)<input name="shamcash_name" className="a-in" defaultValue={profileRow?.shamcash_name ?? ""} placeholder="شغلات بنات" /></label>
      <ImageUpload name="shamcash_qr_url" folder="payment" label="رمز QR الخاص بحساب شام كاش" ratio="1 / 1" initial={profileRow?.shamcash_qr_url ? [profileRow.shamcash_qr_url] : []} />
    </FormCard>
      </div>
    </>
  );
}
