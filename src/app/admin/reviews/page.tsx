import { requireStaff } from "@/lib/admin";
import { rolesFor } from "@/lib/access";
import { date } from "@/lib/format";
import { FormCard } from "../FormCard";
import { saveTestimonial } from "../actions";
import { ReviewControls } from "./ReviewControls";

export const metadata = { title: "آراء الزبونات" };

export default async function ReviewsPage() {
  const { sb } = await requireStaff(rolesFor("/admin/reviews"));
  const { data } = await sb.from("testimonials").select("*").order("created_at", { ascending: false });

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">آراء الزبونات</h1><span className="adm-sub">تظهر في قسم «قالوا عنّا» على الصفحة الرئيسية — يختفي القسم إن لم يوجد رأي ظاهر</span></div></div>
      <div className="split">
        <div className="wide" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, alignContent: "start" }}>
          {!data?.length && <div className="acard adm-sub">لا توجد آراء بعد. أضيفي أول رأي من النموذج.</div>}
          {(data ?? []).map((r) => (
            <div key={r.id} className="acard" style={{ display: "flex", flexDirection: "column", gap: 12, opacity: r.is_visible ? 1 : 0.6 }}>
              <span style={{ color: "var(--magenta)", letterSpacing: 2 }}>{"★".repeat(r.rating)}<span style={{ color: "var(--rosy-gray)" }}>{"★".repeat(5 - r.rating)}</span></span>
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
    </>
  );
}
