import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { date, ORDER_STATUS, PAYMENT_LABEL, price } from "@/lib/format";
import { StatusButtons } from "./StatusButtons";

export const metadata = { title: "الطلبات" };
const TABS = ["all", "new", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; id?: string; q?: string }> }) {
  const { status = "all", id, q = "" } = await searchParams;
  const { sb } = await requireStaff();

  let query = sb.from("orders").select("id,number,status,channel,payment_method,total,created_at,customer_phone,user:profiles!orders_user_id_fkey(full_name,phone,email)").order("created_at", { ascending: false }).limit(100);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("number", `%${q.replace(/[%#]/g, "")}%`);
  const [{ data: orders }, { data: counts }] = await Promise.all([query, sb.from("orders").select("status")]);
  const countBy = (s: string) => (counts ?? []).filter((c) => s === "all" || c.status === s).length;

  const selId = id ?? orders?.[0]?.id;
  const { data: sel } = selId
    ? await sb.from("orders").select("id,number,status,channel,payment_method,is_paid,total,subtotal,shipping,discount,created_at,address_snapshot,customer_phone,note,user:profiles!orders_user_id_fkey(full_name,phone,email),order_items(product_name,variant_label,unit_price,qty),order_events(status,note,created_at)").eq("id", selId).maybeSingle()
    : { data: null };

  const qs = (s: string, i?: string) => `/admin/orders?status=${s}${i ? `&id=${i}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="adm-top">
        <div className="title-block">
          <h1 className="adm-h1">الطلبات</h1>
          <span className="adm-sub">طلبات المتجر الإلكتروني والمحل في مكان واحد</span>
        </div>
        <form action="/admin/orders" style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="status" value={status} />
          <label className="sr" htmlFor="oq">رقم الطلب</label>
          <input id="oq" name="q" defaultValue={q} className="a-in" placeholder="ابحثي برقم الطلب" style={{ width: 240 }} />
          <button className="btn secondary" type="submit">بحث</button>
        </form>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t} href={qs(t)} className={`a-chip${status === t ? " on" : ""}`}>
            {t === "all" ? "الكل" : ORDER_STATUS[t].label}<span className="n">{countBy(t)}</span>
          </Link>
        ))}
      </div>

      <div className="split">
        <div className="acard flush wide">
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>العميلة</th><th>القناة</th><th>الدفع</th><th>المبلغ</th><th>الحالة</th></tr></thead>
              <tbody>
                {(orders ?? []).map((o: any) => (
                  <tr key={o.id} className={o.id === selId ? "sel" : ""}>
                    <td><Link className="rowlink ltr" href={qs(status, o.id)}>#{o.number}</Link></td>
                    <td className="caption">{date(o.created_at, true)}</td>
                    <td>{o.user?.full_name || o.user?.phone || o.user?.email || o.customer_phone || "زائرة المحل"}</td>
                    <td className="caption">{o.channel === "online" ? "إلكتروني" : "المحل"}</td>
                    <td className="caption">{PAYMENT_LABEL[o.payment_method]}</td>
                    <td style={{ fontWeight: 600 }}>{price(o.total)}</td>
                    <td><span className={`pill tone-${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span></td>
                  </tr>
                ))}
                {!orders?.length && <tr><td colSpan={7} className="caption" style={{ textAlign: "center", padding: 24 }}>لا توجد طلبات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {sel && (
          <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="row-between" style={{ alignItems: "flex-start" }}>
              <div className="title-block" style={{ gap: 4 }}>
                <h2 className="adm-h2 ltr" style={{ textAlign: "right" }}>#{sel.number}</h2>
                <span className="caption">{date(sel.created_at, true)} · {sel.channel === "online" ? "إلكتروني" : "المحل"}</span>
              </div>
              <span className={`pill tone-${ORDER_STATUS[sel.status].tone}`}>{ORDER_STATUS[sel.status].label}</span>
            </div>
            <div style={{ padding: 14, borderRadius: 18, background: "var(--surface-admin)", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{(sel as any).user?.full_name || "عميلة"}</span>
              {((sel as any).user?.phone || sel.customer_phone) && <span className="caption ltr" style={{ textAlign: "right" }}>{(sel as any).user?.phone || sel.customer_phone}</span>}
              {(sel.address_snapshot as any) && <span className="caption" style={{ lineHeight: 1.7 }}>{(sel.address_snapshot as any).city}، {(sel.address_snapshot as any).street}{(sel.address_snapshot as any).recipient_phone ? ` · ${(sel.address_snapshot as any).recipient_phone}` : ""}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(sel.order_items as any[]).map((it, i) => (
                <div key={i} className="kv"><span>{it.product_name}{it.variant_label ? ` · ${it.variant_label}` : ""} × {it.qty}</span><span>{price(it.unit_price * it.qty)}</span></div>
              ))}
            </div>
            <hr className="divider" style={{ background: "var(--border-soft)" }} />
            <div className="kv"><span className="adm-sub">الشحن</span><span>{Number(sel.shipping) ? price(sel.shipping) : "مجاني"}</span></div>
            {Number(sel.discount) > 0 && <div className="kv" style={{ color: "var(--magenta)" }}><span>الخصم</span><span>- {price(sel.discount)}</span></div>}
            <div className="kv" style={{ fontSize: 16, fontWeight: 700 }}><span>الإجمالي</span><span style={{ color: "var(--magenta)" }}>{price(sel.total)}</span></div>
            <div className="kv"><span className="adm-sub">الدفع</span><span>{PAYMENT_LABEL[sel.payment_method]} · {sel.is_paid ? "مدفوع" : "غير مدفوع"}</span></div>
            {sel.channel === "online" && <StatusButtons orderId={sel.id} current={sel.status} />}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>السجل</span>
              {(sel.order_events as any[]).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((e, i) => (
                <span key={i} className="caption">{date(e.created_at, true)} — {ORDER_STATUS[e.status].label}{e.note ? ` (${e.note})` : ""}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
