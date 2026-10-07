import { requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";
import { FormCard } from "../FormCard";
import { saveCoupon } from "../actions";
import { CouponToggle } from "./CouponToggle";

export const metadata = { title: "الكوبونات" };
const KIND: Record<string, string> = { percent: "نسبة", fixed: "مبلغ ثابت", free_shipping: "شحن مجاني" };
const CH: Record<string, string> = { all: "التطبيق والمحل", online: "التطبيق", store: "المحل" };

export default async function CouponsPage() {
  const { sb } = await requireStaff();
  const { data } = await sb.from("coupons").select("*").order("code");
  const now = Date.now();

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الكوبونات والعروض</h1><span className="adm-sub">أكواد خصم للتطبيق ونقطة البيع</span></div></div>
      <div className="split">
        <div className="wide" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {(data ?? []).map((c) => {
            const expired = c.ends_at && new Date(c.ends_at).getTime() < now;
            const scheduled = c.starts_at && new Date(c.starts_at).getTime() > now;
            const state = !c.is_active ? ["متوقف", "tone-neutral"] : expired ? ["منتهٍ", "tone-neutral"] : scheduled ? ["مجدول", "tone-info"] : ["نشط", "tone-success"];
            const pct = c.max_uses ? Math.min(100, (c.used_count / c.max_uses) * 100) : 0;
            return (
              <div key={c.code} className="acard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="row-between">
                  <span className="ltr" style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1, padding: "6px 12px", borderRadius: 12, border: "1.5px dashed var(--magenta)", color: "var(--magenta)" }}>{c.code}</span>
                  <span className={`pill ${state[1]}`}>{state[0]}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{c.description || `${KIND[c.kind]} ${c.kind === "percent" ? c.value + "%" : c.kind === "fixed" ? price(c.value) : ""}`}</span>
                <div className="kv" style={{ fontSize: 13 }}><span className="adm-sub">الاستخدام</span><span>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : " · غير محدود"}</span></div>
                {c.max_uses && <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--light-blush)", overflow: "hidden" }}><span style={{ display: "block", height: 6, width: `${pct}%`, background: "var(--magenta)" }} /></span>}
                <div className="kv" style={{ fontSize: 13 }}><span className="adm-sub">الحد الأدنى</span><span>{Number(c.min_order) ? price(c.min_order) : "—"}</span></div>
                <div className="kv" style={{ fontSize: 13 }}><span className="adm-sub">الصلاحية</span><span>{c.starts_at || c.ends_at ? `${c.starts_at ? date(c.starts_at) : "…"} – ${c.ends_at ? date(c.ends_at) : "…"}` : "دائم"}</span></div>
                <div className="kv" style={{ fontSize: 13, alignItems: "center" }}><span className="adm-sub">{CH[c.channel]}</span><CouponToggle code={c.code} active={c.is_active} /></div>
              </div>
            );
          })}
        </div>
        <div className="narrow">
          <FormCard title="كوبون جديد" action={saveCoupon} submitLabel="إنشاء الكوبون">
            <label className="a-field">الكود<input name="code" className="a-in ltr" required placeholder="BANAT20" style={{ letterSpacing: 1 }} /></label>
            <label className="a-field">الوصف<input name="description" className="a-in" placeholder="خصم 20% على العبايات" /></label>
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">النوع<select name="kind" className="a-in"><option value="percent">نسبة %</option><option value="fixed">مبلغ ثابت</option><option value="free_shipping">شحن مجاني</option></select></label>
              <label className="a-field">القيمة<input name="value" type="number" min="0" step="0.01" className="a-in" placeholder="20" /></label>
              <label className="a-field">الحد الأدنى للطلب<input name="min_order" type="number" min="0" className="a-in" placeholder="0" /></label>
              <label className="a-field">عدد مرات الاستخدام<input name="max_uses" type="number" min="1" className="a-in" placeholder="غير محدود" /></label>
              <label className="a-field">من تاريخ<input name="starts_at" type="date" className="a-in" /></label>
              <label className="a-field">إلى تاريخ<input name="ends_at" type="date" className="a-in" /></label>
            </div>
            <label className="a-field">القناة<select name="channel" className="a-in"><option value="all">التطبيق والمحل</option><option value="online">التطبيق فقط</option><option value="store">المحل فقط</option></select></label>
          </FormCard>
        </div>
      </div>
    </>
  );
}
