import { requireStaff } from "@/lib/admin";
import { FormCard } from "../FormCard";
import { saveStoreProfile, saveTestimonial } from "../actions";
import { date } from "@/lib/format";
import { ReviewControls } from "./ReviewControls";
import { ClearSamples } from "./ClearSamples";
import { CatalogSection } from "./CatalogSection";
import { HomeSection } from "./HomeSection";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ImageUpload } from "../ImageUpload";

export const metadata = { title: "إعدادات المتجر" };

const TABS = [
  { key: "contact", label: "التواصل والدفع", icon: "card" },
  { key: "home", label: "الصفحة الرئيسية", icon: "grid" },
  { key: "catalog", label: "الأقسام والبانرات", icon: "star" },
  { key: "reviews", label: "آراء الزبونات", icon: "chat" },
] as const;

export default async function StoreSettings({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "contact";
  const { sb } = await requireStaff("/admin/settings");
  const [{ data: profileRow }, { data: reviews }] = await Promise.all([
    sb.from("store_profile").select("whatsapp,facebook_url,instagram_url,tagline,shamcash_qr_url,shamcash_name,shamcash_code").eq("id", 1).maybeSingle(),
    sb.from("testimonials").select("*").order("is_sample").order("created_at", { ascending: false }),
  ]);
  const samples = (reviews ?? []).filter((r) => r.is_sample).length;
  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">إعدادات المتجر</h1><span className="adm-sub">التواصل والدفع، وأقسام الصفحة الرئيسية، والأقسام والبانرات، وآراء الزبونات</span></div></div>
      <nav className="inv-tabs" aria-label="إعدادات المتجر">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === "contact" ? "/admin/settings" : `/admin/settings?tab=${t.key}`} className={`inv-tab${tab === t.key ? " on" : ""}`} aria-current={tab === t.key ? "page" : undefined}>
            <Icon name={t.icon} size={17} stroke={2} /> {t.label}
          </Link>
        ))}
      </nav>
      {tab === "catalog" && <CatalogSection />}
      {tab === "home" && <HomeSection />}
      {tab === "contact" && <div style={{ maxWidth: 900 }}>
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
      <label className="a-field">كود حساب شام كاش (تنسخه العميلة للتحويل)<input name="shamcash_code" className="a-in ltr" defaultValue={profileRow?.shamcash_code ?? ""} placeholder="761b59fc21bf74f2..." autoComplete="off" spellCheck={false} /></label>
      <ImageUpload name="shamcash_qr_url" folder="payment" label="رمز QR الخاص بحساب شام كاش" ratio="1 / 1" initial={profileRow?.shamcash_qr_url ? [profileRow.shamcash_qr_url] : []} />
    </FormCard>
      </div>}

      {tab === "reviews" && <section id="reviews" style={{ display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 24 }}>
        <div className="row-between" style={{ flexWrap: "wrap" }}>
          <div className="title-block"><h2 className="adm-h2">آراء الزبونات</h2><span className="adm-sub">تظهر في قسم «قالوا عنّا» على الصفحة الرئيسية، ويختفي القسم إن لم يوجد رأي ظاهر</span></div>
          <ClearSamples count={samples} />
        </div>
        {samples > 0 && <div className="a-flash tone-info" style={{ lineHeight: 1.7 }}>الآراء المعلّمة «تجريبي» للمعاينة فقط: تظهر على المتجر لفريق العمل المسجّل دخوله، ولا تراها الزبونات أبداً. احذفها عند إضافة آراء حقيقية.</div>}
        <div className="split">
          <div className="wide" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, alignContent: "start" }}>
            {!reviews?.length && <div className="acard adm-sub">لا توجد آراء بعد. أضيفي أول رأي من النموذج.</div>}
            {(reviews ?? []).map((r) => (
              <div key={r.id} className="acard" style={{ display: "flex", flexDirection: "column", gap: 12, opacity: r.is_visible ? 1 : 0.6, borderStyle: r.is_sample ? "dashed" : undefined }}>
                <div className="row-between">
                  <span style={{ color: "var(--magenta)", letterSpacing: 2 }}>{"★".repeat(r.rating)}<span style={{ color: "var(--rosy-gray)" }}>{"★".repeat(5 - r.rating)}</span></span>
                  {r.is_sample && <span className="pill tone-info">تجريبي</span>}
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{r.body}</p>
                <div className="kv" style={{ fontSize: 13 }}><b>{r.name}{r.city ? ` · ${r.city}` : ""}</b><span className="adm-sub">{date(r.created_at)}</span></div>
                <ReviewControls id={r.id} visible={r.is_visible} />
              </div>
            ))}
          </div>
          <div className="narrow">
            <FormCard title="رأي جديد" action={saveTestimonial} submitLabel="إضافة الرأي">
              <label className="a-field">اسم الزبونة<input name="name" className="a-in" required placeholder="رنا" /></label>
              <label className="a-field">المدينة<input name="city" className="a-in" placeholder="دمشق" /></label>
              <label className="a-field">التقييم<select name="rating" className="a-in" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} نجوم</option>)}</select></label>
              <label className="a-field">نص الرأي<textarea name="body" className="a-in" required rows={4} maxLength={400} placeholder="التغليف كان رائعاً والقطعة أجمل من الصورة" style={{ height: "auto", paddingBlock: 12, lineHeight: 1.6 }} /></label>
            </FormCard>
          </div>
        </div>
      </section>}
    </>
  );
}
