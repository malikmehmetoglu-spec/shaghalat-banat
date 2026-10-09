import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";
import { MarketingToggle } from "./MarketingToggle";

export const metadata = { title: "العملاء" };

const WA = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2Z"/></svg>;
const CALL = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>;

const FILTERS = [
  ["all", "الكل"], ["store", "من المحل"], ["online", "من المتجر"], ["both", "من الاثنين"], ["mk", "موافقات التسويق"],
] as const;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; id?: string; f?: string }> }) {
  const { q = "", id, f = "all" } = await searchParams;
  const { sb } = await requireStaff();
  let query = sb.from("customer_stats").select("*").order("last_order", { ascending: false, nullsFirst: false }).limit(300);
  const s = q.trim().replace(/[,()%]/g, "");
  if (s) {
    let d = s.replace(/\D/g, "");
    if (d.startsWith("0")) d = d.replace(/^0+/, "");
    query = d.length >= 3 ? query.or(`name.ilike.%${s}%,phone.ilike.%${d}%`) : query.ilike("name", `%${s}%`);
  }
  if (f === "store") query = query.eq("bought_store", true);
  if (f === "online") query = query.eq("bought_online", true);
  if (f === "both") query = query.eq("bought_store", true).eq("bought_online", true);
  if (f === "mk") query = query.eq("marketing_opt_in", true);
  const { data, error } = await query;

  const rows = (data ?? []).map((c: any) => {
    const n = Number(c.orders_count);
    const tier = n >= 5 ? ["مميّزة", "tone-brand"] : n >= 2 ? ["دائمة", "tone-info"] : ["جديدة", "tone-success"];
    return { ...c, n, tier };
  });
  const sel = rows.find((r) => r.phone === id) ?? rows[0];
  const { data: selOrders } = sel ? await sb.from("orders").select("id,number,total,status,channel,created_at").eq("customer_phone", sel.phone).order("created_at", { ascending: false }).limit(6) : { data: [] };
  const href = (extra: Record<string, string>) => "/admin/customers?" + new URLSearchParams({ ...(q ? { q } : {}), ...(f !== "all" ? { f } : {}), ...extra }).toString();
  const showPhone = (p: string) => "+" + p;

  return (
    <>
      <div className="adm-top">
        <div className="title-block"><h1 className="adm-h1">العملاء</h1><span className="adm-sub">{rows.length} عميلة · من المحل والمتجر معاً، والرقم هو المرجع</span></div>
      </div>

      <form action="/admin/customers" className="acard" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {f !== "all" && <input type="hidden" name="f" value={f} />}
        <label className="sr" htmlFor="cq">بحث</label>
        <input id="cq" name="q" defaultValue={q} className="a-in" placeholder="ابحثي بالاسم أو رقم الهاتف" style={{ flex: "1 1 240px" }} />
        <button className="btn" type="submit">بحث</button>
        {q && <Link className="btn soft" href={f !== "all" ? `/admin/customers?f=${f}` : "/admin/customers"}>مسح</Link>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexBasis: "100%" }}>
          {FILTERS.map(([k, l]) => <Link key={k} href={"/admin/customers?" + new URLSearchParams({ ...(q ? { q } : {}), ...(k !== "all" ? { f: k } : {}) })} className={`a-chip${f === k ? " on" : ""}`}>{l}</Link>)}
        </div>
      </form>

      {error ? <div className="acard caption">تعذّر تحميل العملاء: {error.message}</div> : (
      <div className="split">
        <div className="acard flush wide">
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>العميلة</th><th>الهاتف</th><th>من أين</th><th>الطلبات</th><th>المشتريات</th><th>آخر شراء</th><th>تواصل</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.phone} className={sel?.phone === c.phone ? "sel" : ""}>
                    <td>
                      <Link className="rowlink" href={href({ id: c.phone })}>{c.name || "بدون اسم"}</Link>
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        <span className={`pill ${c.tier[1]}`}>{c.tier[0]}</span>
                        {c.marketing_opt_in && <span className="pill tone-brand" title="وافقت على قنوات العروض">📣 تسويق</span>}
                      </div>
                    </td>
                    <td className="caption ltr" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{showPhone(c.phone)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {c.bought_store && <span className="pill tone-neutral" style={{ marginInlineEnd: 4 }}>المحل</span>}
                      {c.bought_online && <span className="pill tone-info">المتجر</span>}
                      {!c.bought_store && !c.bought_online && <span className="caption">—</span>}
                    </td>
                    <td>{c.n}</td>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{price(Number(c.spent))}</td>
                    <td className="caption" style={{ whiteSpace: "nowrap" }}>{c.last_order ? date(c.last_order) : "—"}</td>
                    <td>
                      <span style={{ display: "flex", gap: 6 }}>
                        <a className="icon-act wa" href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer" aria-label={`واتساب ${c.name ?? ""}`} title="واتساب">{WA}</a>
                        <a className="icon-act call" href={`tel:+${c.phone}`} aria-label={`اتصال ${c.name ?? ""}`} title="اتصال">{CALL}</a>
                      </span>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={7} className="caption" style={{ textAlign: "center", padding: 24 }}>{q ? "لا نتائج لهذا البحث" : "لا توجد عميلات بعد"}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {sel && (
          <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 60, height: 60, flexShrink: 0, borderRadius: "50%", background: "var(--magenta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>{(sel.name || "ع")[0]}</span>
              <div className="title-block" style={{ gap: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{sel.name || "بدون اسم"}</span>
                <span className="caption ltr" style={{ textAlign: "right" }}>{showPhone(sel.phone)}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              <a className="btn" href={`https://wa.me/${sel.phone}`} target="_blank" rel="noreferrer" style={{ background: "#25D366", gap: 8 }}>{WA} واتساب</a>
              <a className="btn secondary" href={`tel:+${sel.phone}`} style={{ gap: 8 }}>{CALL} اتصال</a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
              {[[sel.n, "عملية شراء"], [price(Number(sel.spent)), "مجموع المشتريات"]].map(([v, l]) => (
                <div key={String(l)} style={{ padding: "12px 6px", borderRadius: 16, background: "var(--surface-admin)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}><b style={{ fontSize: 15, lineHeight: 1.4 }}>{v}</b><span className="caption">{l}</span></div>
              ))}
            </div>
            <MarketingToggle phone={sel.phone} on={sel.marketing_opt_in} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="caption">أول ظهور: {sel.first_source === "store" ? "المحل" : "المتجر"} · {date(sel.created_at)}</span>
              {sel.marketing_opt_in && sel.opt_in_at && <span className="caption">وافقت على التسويق في {date(sel.opt_in_at)}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>آخر عمليات الشراء</span>
              {(selOrders ?? []).map((o: any) => (
                <Link key={o.id} href={`/admin/orders?id=${o.id}`} className="kv" style={{ color: "inherit" }}>
                  <span><span className="ltr">#{o.number}</span> <span className="caption">· {o.channel === "store" ? "المحل" : "المتجر"} · {date(o.created_at)}</span></span>
                  <span className="adm-sub">{price(Number(o.total))}</span>
                </Link>
              ))}
              {!selOrders?.length && <span className="caption">لا توجد عمليات شراء</span>}
            </div>
          </div>
        )}
      </div>)}
    </>
  );
}
