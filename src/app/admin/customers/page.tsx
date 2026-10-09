import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { CustomersView, type Row } from "./CustomersView";

export const metadata = { title: "العملاء" };

const WA = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2Z"/></svg>;
const CALL = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>;

const FILTERS = [
  ["all", "الكل"], ["store", "من المحل"], ["online", "من المتجر"], ["both", "من الاثنين"], ["mk", "وافقت على التسويق"], ["nomk", "لم توافق"],
] as const;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q = "", f = "all" } = await searchParams;
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
  if (f === "nomk") query = query.eq("marketing_opt_in", false);
  const { data, error } = await query;

  const phones = (data ?? []).map((c: any) => c.phone);
  const { data: ords } = phones.length ? await sb.from("orders").select("id,number,total,channel,created_at,customer_phone").in("customer_phone", phones).neq("status", "cancelled").order("created_at", { ascending: false }).limit(3000) : { data: [] };
  const byPhone = new Map<string, Row["orders"]>();
  for (const o of ords ?? []) { const l = byPhone.get(o.customer_phone) ?? []; if (l.length < 6) l.push({ ...o, total: Number(o.total) }); byPhone.set(o.customer_phone, l); }
  const rows: Row[] = (data ?? []).map((c: any) => ({ ...c, n: Number(c.orders_count), spent: Number(c.spent), orders: byPhone.get(c.phone) ?? [] }));

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

      {error ? <div className="acard caption">تعذّر تحميل العملاء: {error.message}</div> : <CustomersView key={q + f} rows={rows} empty={q ? "لا نتائج لهذا البحث" : "لا توجد عميلات بعد"} />}
    </>
  );
}
