import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { date, ORDER_STATUS, price, num } from "@/lib/format";

export const metadata = { title: "لوحة المؤشرات" };

export default async function AdminHome() {
  const { sb, profile } = await requireStaff();
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const start7 = new Date(startToday); start7.setDate(start7.getDate() - 6);

  const [{ data: week }, { data: recent }, { data: stock }, { count: newCustomers }] = await Promise.all([
    sb.from("orders").select("total,channel,created_at,status").gte("created_at", start7.toISOString()).neq("status", "cancelled"),
    sb.from("orders").select("id,number,total,status,channel,created_at,address_snapshot,customer_phone").order("created_at", { ascending: false }).limit(6),
    sb.from("stock_levels").select("on_hand,reserved,reorder_point,location_id,variant:product_variants(sku,size,color_name,product:products(name))"),
    sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer").gte("created_at", startToday.toISOString()),
  ]);

  const orders = week ?? [];
  const today = orders.filter((o) => new Date(o.created_at) >= startToday);
  const todaySales = today.reduce((s, o) => s + Number(o.total), 0);
  const avg = today.length ? todaySales / today.length : 0;
  const online = orders.filter((o) => o.channel === "online").reduce((s, o) => s + Number(o.total), 0);
  const store = orders.filter((o) => o.channel === "store").reduce((s, o) => s + Number(o.total), 0);
  const totalWeek = online + store;

  // مبيعات آخر 7 أيام لكل قناة
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start7); d.setDate(d.getDate() + i);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const inDay = orders.filter((o) => { const t = new Date(o.created_at); return t >= d && t < next; });
    return {
      label: d.toLocaleDateString("ar", { weekday: "short" }),
      on: inDay.filter((o) => o.channel === "online").reduce((s, o) => s + Number(o.total), 0),
      st: inDay.filter((o) => o.channel === "store").reduce((s, o) => s + Number(o.total), 0),
    };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.on + d.st));

  // تنبيهات النقص: مجموع المتاح لكل متغير أقل من حد الطلب
  const byVariant = new Map<string, { name: string; avail: number; min: number }>();
  (stock ?? []).forEach((s: any) => {
    const key = s.variant.sku;
    const cur = byVariant.get(key) ?? { name: `${s.variant.product.name}${s.variant.size ? " · " + s.variant.size : ""}${s.variant.color_name ? " · " + s.variant.color_name : ""}`, avail: 0, min: 0 };
    cur.avail += Math.max(0, s.on_hand - s.reserved);
    cur.min += s.reorder_point;
    byVariant.set(key, cur);
  });
  const low = [...byVariant.values()].filter((v) => v.avail <= v.min).sort((a, b) => a.avail - b.avail);

  return (
    <>
      <div className="adm-top">
        <div className="title-block">
          <h1 className="adm-h1">مرحباً{profile.full_name ? `، ${profile.full_name}` : ""}</h1>
          <span className="adm-sub">ملخّص أداء المتجر اليوم، {date(new Date())}</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/admin/pos" className="btn">نقطة البيع</Link>
          <Link href="/admin/products/new" className="btn secondary">إضافة منتج</Link>
        </div>
      </div>

      <div className="kpis">
        <div className="acard kpi"><span className="adm-sub">مبيعات اليوم</span><span className="v">{price(todaySales)}</span><span className="caption">{today.length} عملية</span></div>
        <div className="acard kpi"><span className="adm-sub">طلبات جديدة تنتظر</span><span className="v">{orders.filter((o) => o.status === "new").length}</span><Link href="/admin/orders?status=new" className="caption" style={{ color: "var(--deep-berry)" }}>عرض الطلبات</Link></div>
        <div className="acard kpi"><span className="adm-sub">متوسط قيمة الطلب اليوم</span><span className="v">{price(Math.round(avg))}</span></div>
        <div className="acard kpi"><span className="adm-sub">عميلات جدد اليوم</span><span className="v">{num(newCustomers ?? 0)}</span></div>
      </div>

      <div className="split">
        <div className="acard wide" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="row-between" style={{ flexWrap: "wrap" }}>
            <h2 className="adm-h2">المبيعات خلال آخر 7 أيام</h2>
            <div style={{ display: "flex", gap: 16, fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--magenta)" }} />المتجر الإلكتروني</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--rosy-gray)" }} />المحل</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, height: 220, alignItems: "flex-end", borderBottom: "1px solid var(--border-soft)" }}>
            {days.map((d, i) => (
              <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6 }} title={`${price(d.on + d.st)}`}>
                <span className="caption" style={{ fontSize: 11 }}>{d.on + d.st ? num(d.on + d.st) : ""}</span>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 170, width: "100%", justifyContent: "center" }}>
                  <span style={{ width: "40%", maxWidth: 22, borderRadius: "6px 6px 0 0", background: "var(--magenta)", height: `${(d.on / maxDay) * 100}%`, minHeight: d.on ? 4 : 0 }} />
                  <span style={{ width: "40%", maxWidth: 22, borderRadius: "6px 6px 0 0", background: "var(--rosy-gray)", height: `${(d.st / maxDay) * 100}%`, minHeight: d.st ? 4 : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: -8 }}>
            {days.map((d, i) => <span key={i} className="caption" style={{ flex: 1, textAlign: "center" }}>{d.label}</span>)}
          </div>
        </div>

        <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="adm-h2">المبيعات حسب القناة</h2>
          <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "var(--light-blush)" }}>
            <span style={{ width: `${totalWeek ? (online / totalWeek) * 100 : 0}%`, background: "var(--magenta)" }} />
            <span style={{ width: `${totalWeek ? (store / totalWeek) * 100 : 0}%`, background: "var(--rosy-gray)" }} />
          </div>
          <div className="kv"><span>المتجر الإلكتروني</span><b>{price(online)}</b></div>
          <div className="kv"><span>المحل</span><b>{price(store)}</b></div>
          <hr className="divider" style={{ background: "var(--border-soft)" }} />
          <div className="row-between"><h2 className="adm-h2">تنبيهات النقص</h2><span className="pill tone-warning">{low.length}</span></div>
          {low.slice(0, 5).map((l) => (
            <div key={l.name} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderRadius: 14, background: "var(--surface-admin)" }}>
              <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{l.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: l.avail === 0 ? "var(--danger-fg)" : "var(--warning-fg)", flexShrink: 0 }}>{l.avail === 0 ? "نفد" : `متبقٍّ ${l.avail}`}</span>
            </div>
          ))}
          {low.length > 5 && <Link href="/admin/inventory/alerts" className="caption" style={{ color: "var(--deep-berry)" }}>عرض الكل</Link>}
        </div>
      </div>

      <div className="acard flush">
        <div className="row-between" style={{ padding: "12px 14px 4px" }}>
          <h2 className="adm-h2">أحدث الطلبات</h2>
          <Link href="/admin/orders" className="link-btn">عرض الكل</Link>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>القناة</th><th>المبلغ</th><th>الحالة</th></tr></thead>
            <tbody>
              {(recent ?? []).map((o) => (
                <tr key={o.id}>
                  <td><Link className="rowlink ltr" href={`/admin/orders?id=${o.id}`}>#{o.number}</Link></td>
                  <td className="caption">{date(o.created_at, true)}</td>
                  <td className="caption">{o.channel === "online" ? "إلكتروني" : "المحل"}</td>
                  <td style={{ fontWeight: 600 }}>{price(o.total)}</td>
                  <td><span className={`pill tone-${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span></td>
                </tr>
              ))}
              {!recent?.length && <tr><td colSpan={5} className="caption" style={{ textAlign: "center", padding: 24 }}>لا توجد طلبات بعد</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
