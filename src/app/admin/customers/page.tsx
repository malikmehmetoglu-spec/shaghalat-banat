import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";

export const metadata = { title: "العملاء" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; id?: string }> }) {
  const { q = "", id } = await searchParams;
  const { sb } = await requireStaff();
  let query = sb.from("profiles").select("id,full_name,phone,email,usual_size,points,created_at,orders:orders!orders_user_id_fkey(total,created_at,status)").eq("role", "customer").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  const { data } = await query;

  const rows = (data ?? []).map((c: any) => {
    const valid = c.orders.filter((o: any) => o.status !== "cancelled");
    const spent = valid.reduce((s: number, o: any) => s + Number(o.total), 0);
    const last = valid.map((o: any) => o.created_at).sort().pop();
    const tier = valid.length >= 5 ? ["مميّزة", "tone-brand"] : valid.length >= 2 ? ["دائمة", "tone-info"] : ["جديدة", "tone-success"];
    return { ...c, count: valid.length, spent, last, tier };
  });
  const sel = rows.find((r) => r.id === id) ?? rows[0];
  const { data: selOrders } = sel ? await sb.from("orders").select("id,number,total,status,created_at").eq("user_id", sel.id).order("created_at", { ascending: false }).limit(5) : { data: [] };
  const { data: addr } = sel ? await sb.from("addresses").select("city,street").eq("user_id", sel.id).eq("is_default", true).maybeSingle() : { data: null };

  return (
    <>
      <div className="adm-top">
        <div className="title-block"><h1 className="adm-h1">العملاء</h1><span className="adm-sub">{rows.length} عميلة</span></div>
        <form action="/admin/customers"><label className="sr" htmlFor="cq">بحث</label><input id="cq" name="q" defaultValue={q} className="a-in" placeholder="الاسم أو الهاتف أو البريد" style={{ width: 260 }} /></form>
      </div>
      <div className="split">
        <div className="acard flush wide">
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>العميلة</th><th>التواصل</th><th>الطلبات</th><th>إجمالي المشتريات</th><th>آخر طلب</th><th>التصنيف</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className={sel?.id === c.id ? "sel" : ""}>
                    <td><Link className="rowlink" href={`/admin/customers?id=${c.id}${q ? `&q=${q}` : ""}`}>{c.full_name || "بدون اسم"}</Link></td>
                    <td className="caption ltr" style={{ textAlign: "right" }}>{c.phone || c.email || "—"}</td>
                    <td>{c.count}</td>
                    <td style={{ fontWeight: 600 }}>{price(c.spent)}</td>
                    <td className="caption">{c.last ? date(c.last) : "—"}</td>
                    <td><span className={`pill ${c.tier[1]}`}>{c.tier[0]}</span></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={6} className="caption" style={{ textAlign: "center", padding: 24 }}>لا توجد عميلات بعد</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {sel && (
          <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 60, height: 60, flexShrink: 0, borderRadius: "50%", background: "var(--magenta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>{(sel.full_name || "ع")[0]}</span>
              <div className="title-block" style={{ gap: 4 }}><span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{sel.full_name || "بدون اسم"}</span><span className={`pill ${sel.tier[1]}`} style={{ alignSelf: "flex-start" }}>{sel.tier[0]}</span></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
              {[[sel.count, "طلب"], [price(sel.spent), "مشتريات"], [sel.points, "نقطة"]].map(([v, l]) => (
                <div key={String(l)} style={{ padding: "12px 6px", borderRadius: 16, background: "var(--surface-admin)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}><b style={{ fontSize: 15, lineHeight: 1.4 }}>{v}</b><span className="caption">{l}</span></div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sel.phone && <span className="caption ltr" style={{ textAlign: "right", fontSize: 14 }}>{sel.phone}</span>}
              {sel.email && <span className="caption ltr" style={{ textAlign: "right", fontSize: 14 }}>{sel.email}</span>}
              {addr && <span className="caption" style={{ fontSize: 14 }}>{addr.city}، {addr.street}</span>}
              {sel.usual_size && <span className="caption" style={{ fontSize: 14 }}>المقاس المعتاد: {sel.usual_size}</span>}
              <span className="caption">عميلة منذ {date(sel.created_at)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>آخر الطلبات</span>
              {(selOrders ?? []).map((o) => <Link key={o.id} href={`/admin/orders?id=${o.id}`} className="kv" style={{ color: "inherit" }}><span className="ltr">#{o.number}</span><span className="adm-sub">{price(o.total)}</span></Link>)}
              {!selOrders?.length && <span className="caption">لا توجد طلبات</span>}
            </div>
            {sel.phone && <a href={`https://wa.me/${sel.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="btn secondary">مراسلة واتساب</a>}
          </div>
        )}
      </div>
    </>
  );
}
