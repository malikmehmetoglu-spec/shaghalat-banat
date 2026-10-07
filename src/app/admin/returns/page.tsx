import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { date } from "@/lib/format";
import { ReturnActions } from "./ReturnActions";

export const metadata = { title: "المرتجعات" };
const ST: Record<string, [string, string]> = { pending: ["بانتظار المراجعة", "tone-warning"], approved: ["موافق عليه", "tone-info"], rejected: ["مرفوض", "tone-neutral"], done: ["مكتمل", "tone-success"] };

export default async function ReturnsAdmin() {
  const { sb } = await requireStaff();
  const { data, error } = await sb.from("return_requests").select("id,number,kind,reason,note,status,created_at,order:orders(id,number,status),item:order_items(product_name,variant_label),user:profiles(full_name,phone)").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">المرتجعات والاستبدال</h1><span className="adm-sub">طلبات العميلات من التطبيق · عند استلام القطعة غيّري حالة الطلب إلى «مُرتجع» ليُعاد المخزون ويُعكس القيد</span></div></div>
      {error ? <div className="acard caption">نفّذي ملف قاعدة البيانات 0005_finance.sql لتفعيل المرتجعات.</div> : (
        <div className="acard flush"><div className="tw"><table className="tbl">
          <thead><tr><th>الرقم</th><th>العميلة</th><th>المنتج</th><th>النوع والسبب</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {(data ?? []).map((r: any) => (
              <tr key={r.id}>
                <td className="ltr" style={{ textAlign: "right", fontWeight: 600 }}>{r.number}<div className="caption"><Link href={`/admin/orders?id=${r.order?.id}`}>#{r.order?.number}</Link></div></td>
                <td>{r.user?.full_name || "—"}<div className="caption ltr" style={{ textAlign: "right" }}>{r.user?.phone}</div></td>
                <td>{r.item?.product_name}<div className="caption">{r.item?.variant_label}</div></td>
                <td><span className="pill tone-brand">{r.kind === "exchange" ? "استبدال" : "إرجاع"}</span><div className="caption">{r.reason}{r.note ? ` — ${r.note}` : ""}</div></td>
                <td className="caption">{date(r.created_at)}</td>
                <td><span className={`pill ${ST[r.status][1]}`}>{ST[r.status][0]}</span></td>
                <td><ReturnActions id={r.id} status={r.status} /></td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={7} className="caption" style={{ textAlign: "center", padding: 24 }}>لا طلبات إرجاع</td></tr>}
          </tbody>
        </table></div></div>
      )}
    </>
  );
}
