import { requireStaff } from "@/lib/admin";
import { date } from "@/lib/format";
import { pushReady, runDueCampaigns } from "@/lib/push";
import { PushComposer } from "./PushComposer";

export const metadata = { title: "إرسال الإشعارات" };
const AUD: Record<string, string> = { all: "كل المشتركات", buyers: "من اشترين سابقاً", no_orders: "لم يشترين بعد", staff: "فريق العمل", test: "تجريبي" };

export default async function PushPage() {
  const { sb } = await requireStaff();
  const { error } = await sb.from("push_campaigns").select("id").limit(1);
  if (error) return <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}><h1 className="adm-h1">الإشعارات بحاجة لخطوة إعداد</h1><p style={{ lineHeight: 1.8 }}>نفّذي الملف <span className="ltr">supabase/migrations/0006_push.sql</span> في SQL Editor في Supabase ثم حدّثي الصفحة.</p></div>;
  await runDueCampaigns(sb).catch(() => 0);
  const [{ data: list }, { count: total }, { data: subs }, { data: cats }] = await Promise.all([
    sb.from("push_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
    sb.from("push_subscriptions").select("id", { count: "exact", head: true }),
    sb.from("push_subscriptions").select("kind"),
    sb.from("categories").select("name,slug").eq("is_visible", true).order("sort_order"),
  ]);
  const ready = pushReady();
  const web = (subs ?? []).filter((s) => s.kind === "web").length;

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">إرسال الإشعارات</h1><span className="adm-sub">{total ?? 0} جهازاً مشتركاً · متصفح/PWA {web} · تطبيق الجوال {(total ?? 0) - web}</span></div></div>
      {(!ready.web || !ready.fcm) && (
        <div className="a-flash tone-warning" style={{ lineHeight: 1.8 }}>
          {!ready.web && <>لم يُضبط <span className="ltr">VAPID_PRIVATE_KEY</span> في Vercel بعد — لن تصل الإشعارات للمتصفح. </>}
          {!ready.fcm && <>إشعارات تطبيق Android/iOS تحتاج <span className="ltr">FCM_SERVICE_ACCOUNT</span> (يُضبط عند نشر التطبيق في المتاجر).</>}
        </div>
      )}
      <PushComposer categories={(cats ?? []).map((c) => ({ label: c.name, link: `/c/${c.slug}` }))} />
      <div className="acard flush">
        <h2 className="adm-h2" style={{ padding: "12px 14px 4px" }}>الإشعارات السابقة</h2>
        <div className="tw"><table className="tbl">
          <thead><tr><th>العنوان</th><th>الجمهور</th><th>تاريخ الإرسال</th><th>وصل إلى</th><th>الحالة</th></tr></thead>
          <tbody>
            {(list ?? []).map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.title}<div className="caption">{c.body}</div></td>
                <td className="caption">{AUD[c.audience]}</td>
                <td className="caption">{c.sent_at ? date(c.sent_at, true) : c.scheduled_at ? date(c.scheduled_at, true) : "—"}</td>
                <td>{c.sent_at ? `${c.sent_count} جهاز` : "—"}{c.failed_count ? <span className="caption"> · فشل {c.failed_count}</span> : null}</td>
                <td><span className={`pill ${c.sent_at ? "tone-success" : "tone-info"}`}>{c.sent_at ? "أُرسل" : "مجدول"}</span></td>
              </tr>
            ))}
            {!list?.length && <tr><td colSpan={5} className="caption" style={{ textAlign: "center", padding: 24 }}>لم تُرسل إشعارات بعد</td></tr>}
          </tbody>
        </table></div>
      </div>
    </>
  );
}
