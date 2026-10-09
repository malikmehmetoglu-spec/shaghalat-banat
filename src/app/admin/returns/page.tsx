import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { date } from "@/lib/format";
import { ReturnActions } from "./ReturnActions";
import { StoreReturnForm } from "./StoreReturnForm";
import { getLocations } from "@/lib/admin";
import { cell, loadVariants, variantLabel } from "@/lib/inventory";
import { price } from "@/lib/format";

export const metadata = { title: "المرتجعات" };
const ST: Record<string, [string, string]> = { pending: ["بانتظار المراجعة", "tone-warning"], approved: ["موافق عليه", "tone-info"], rejected: ["مرفوض", "tone-neutral"], done: ["مكتمل", "tone-success"] };

export default async function ReturnsAdmin() {
  const { sb } = await requireStaff();
  const [locs, all, { data: sr }] = await Promise.all([
    getLocations(), loadVariants(sb),
    sb.from("store_returns").select("id,number,kind,qty,refund,refund_from,reason,customer_phone,created_at,variant:product_variants(size,color_name,product:products(name)),by:profiles(full_name)").order("created_at", { ascending: false }).limit(50),
  ]);
  const store = locs.find((l) => l.kind === "store");
  const items = all.map((v) => ({ id: v.id, name: v.product, label: variantLabel(v), barcode: v.barcode, sku: v.sku, price: v.price, stock: store ? cell(v, store.id).on_hand : 0 }));
  const { data, error } = await sb.from("return_requests").select("id,number,kind,reason,note,status,created_at,order:orders(id,number,status),item:order_items(product_name,variant_label),user:profiles(full_name,phone)").order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">المرتجعات والاستبدال</h1><span className="adm-sub">مرتجعات المحل تعود للمخزون فوراً · طلبات التطبيق: عند استلام القطعة غيّري حالة الطلب إلى «مُرتجع»</span></div></div>
      <StoreReturnForm items={items} />
      <h2 className="adm-h2" style={{ margin: "20px 0 10px" }}>مرتجعات المحل</h2>
      <div className="acard flush" style={{ marginBottom: 24 }}><div className="tw"><table className="tbl">
        <thead><tr><th>الرقم</th><th>القطعة</th><th>العدد</th><th>النوع</th><th>المبلغ المُعاد</th><th>التاريخ</th></tr></thead>
        <tbody>
          {(sr ?? []).map((r: any) => (
            <tr key={r.id}>
              <td className="ltr" style={{ textAlign: "right", fontWeight: 600 }}>{r.number}</td>
              <td>{r.variant?.product?.name}<div className="caption">{[r.variant?.color_name, r.variant?.size].filter(Boolean).join(" · ")}{r.reason ? ` — ${r.reason}` : ""}</div></td>
              <td>{r.qty}</td>
              <td><span className="pill tone-brand">{r.kind === "cancel" ? "تراجع عن الشراء" : "إرجاع"}</span></td>
              <td>{r.refund_from === "none" ? <span className="caption">استبدال</span> : <>{price(Number(r.refund))}<div className="caption">{r.refund_from === "1110" ? "نقداً" : "تحويل"}</div></>}</td>
              <td className="caption">{date(r.created_at, true)}<div className="caption">{r.by?.full_name}</div></td>
            </tr>
          ))}
          {!sr?.length && <tr><td colSpan={6} className="caption" style={{ textAlign: "center", padding: 24 }}>لا مرتجعات في المحل بعد</td></tr>}
        </tbody>
      </table></div></div>
      <h2 className="adm-h2" style={{ margin: "0 0 10px" }}>طلبات الإرجاع من التطبيق</h2>
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
