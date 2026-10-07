import Link from "next/link";
import { getLocations, requireStaff } from "@/lib/admin";
import { price } from "@/lib/format";
import { cell, loadVariants, variantLabel } from "@/lib/inventory";

export const metadata = { title: "المخزون" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const { view = "all", q = "" } = await searchParams;
  const { sb } = await requireStaff();
  const [locs, all] = await Promise.all([getLocations(), loadVariants(sb)]);
  const shown = locs.filter((l) => view === "all" || (view === "online" ? l.sells_online : l.kind === "store"));
  const rows = all.filter((v) => !q || (v.product + v.sku).toLowerCase().includes(q.toLowerCase()));

  let units = 0, value = 0, low = 0, out = 0;
  for (const v of all) {
    const t = shown.reduce((s, l) => s + cell(v, l.id).on_hand, 0);
    units += t; value += t * v.price;
    if (t === 0) out++; else if (shown.some((l) => { const c = cell(v, l.id); return c.on_hand - c.reserved <= c.reorder_point; })) low++;
  }
  const tabs = [["all", "موحّد"], ["online", "المتاح أونلاين"], ["store", "المحل"]];

  return (
    <>
      <div className="adm-top">
        <div className="title-block"><h1 className="adm-h1">المخزون</h1><span className="adm-sub">الكميات في كل موقع · المحجوز = طلبات أونلاين لم تُشحن بعد</span></div>
        <form action="/admin/inventory" style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="view" value={view} />
          <label className="sr" htmlFor="iq">بحث</label><input id="iq" name="q" defaultValue={q} className="a-in" placeholder="اسم المنتج أو SKU" style={{ width: 240 }} />
        </form>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => <Link key={k} href={`/admin/inventory?view=${k}`} className={`a-chip${view === k ? " on" : ""}`}>{l}</Link>)}
      </div>
      <div className="kpis">
        {[[units, "قطعة في المخزون"], [price(value), "قيمة المخزون (بسعر البيع)"], [low, "قارب على النفاد"], [out, "نفد"]].map(([v, l]) => (
          <div key={String(l)} className="acard" style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 22, lineHeight: 1.4 }}>{v}</b><span className="adm-sub">{l}</span></div>
        ))}
      </div>
      <div className="acard flush">
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>المنتج</th><th>SKU</th>{shown.map((l) => <th key={l.id} style={{ textAlign: "center" }}>{l.name}</th>)}<th style={{ textAlign: "center" }}>محجوز</th><th style={{ textAlign: "center" }}>المتاح</th></tr></thead>
            <tbody>
              {rows.map((v) => {
                const res = shown.reduce((s, l) => s + cell(v, l.id).reserved, 0);
                const tot = shown.reduce((s, l) => s + cell(v, l.id).on_hand, 0);
                const avail = tot - res;
                return (
                  <tr key={v.id}>
                    <td><Link className="rowlink" href={`/admin/products/${v.product_id}`}>{v.product}</Link><div className="caption">{variantLabel(v)}</div></td>
                    <td className="caption ltr" style={{ textAlign: "right" }}>{v.sku}</td>
                    {shown.map((l) => <td key={l.id} style={{ textAlign: "center" }}>{cell(v, l.id).on_hand}</td>)}
                    <td style={{ textAlign: "center" }} className="caption">{res || "—"}</td>
                    <td style={{ textAlign: "center" }}><span className={`pill ${avail <= 0 ? "tone-danger" : avail <= 5 ? "tone-warning" : "tone-success"}`}>{avail}</span></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={shown.length + 4} className="caption" style={{ textAlign: "center", padding: 24 }}>لا نتائج</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
