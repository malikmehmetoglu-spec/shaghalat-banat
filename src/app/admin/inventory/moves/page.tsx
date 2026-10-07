import { getLocations, requireStaff } from "@/lib/admin";
import { date } from "@/lib/format";
import { loadVariants, variantLabel } from "@/lib/inventory";
import { FormCard } from "../../FormCard";
import { transferStock } from "../../actions";

export const metadata = { title: "حركات المخزون" };
const KIND: Record<string, [string, string]> = {
  in: ["إدخال", "tone-success"], out: ["خروج", "tone-info"], transfer: ["تحويل", "tone-brand"], return: ["مرتجع", "tone-warning"],
  adjust: ["تسوية", "tone-neutral"], reserve: ["حجز", "tone-neutral"], release: ["إلغاء حجز", "tone-neutral"],
};

export default async function MovesPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const { sb } = await requireStaff();
  let q = sb.from("stock_movements").select("id,qty,kind,reference,note,created_at,from_location,to_location,variant:product_variants(sku,size,color_name,product:products(name)),by:profiles(full_name)").order("created_at", { ascending: false }).limit(150);
  if (kind) q = q.eq("kind", kind);
  const [{ data }, locs, variants] = await Promise.all([q, getLocations(), loadVariants(sb)]);
  const ln = Object.fromEntries(locs.map((l) => [l.id, l.name]));

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الحركات والتحويل</h1><span className="adm-sub">سجل كل دخول وخروج للبضاعة</span></div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="/admin/inventory/moves" className={`a-chip${!kind ? " on" : ""}`}>الكل</a>
        {Object.entries(KIND).map(([k, [l]]) => <a key={k} href={`/admin/inventory/moves?kind=${k}`} className={`a-chip${kind === k ? " on" : ""}`}>{l}</a>)}
      </div>
      <div className="split">
        <div className="acard flush wide">
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>التاريخ</th><th>النوع</th><th>المنتج</th><th style={{ textAlign: "center" }}>الكمية</th><th>من ← إلى</th><th>المرجع</th></tr></thead>
              <tbody>
                {(data ?? []).map((m: any) => (
                  <tr key={m.id}>
                    <td className="caption">{date(m.created_at)}</td>
                    <td><span className={`pill ${KIND[m.kind]?.[1]}`}>{KIND[m.kind]?.[0]}</span></td>
                    <td>{m.variant?.product?.name}<div className="caption">{variantLabel(m.variant ?? {})}</div></td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{m.qty}</td>
                    <td className="caption">{ln[m.from_location] ?? "—"} ← {ln[m.to_location] ?? "—"}</td>
                    <td className="caption">{m.reference || m.note || "—"}{m.by?.full_name ? ` · ${m.by.full_name}` : ""}</td>
                  </tr>
                ))}
                {!data?.length && <tr><td colSpan={6} className="caption" style={{ textAlign: "center", padding: 24 }}>لا توجد حركات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="narrow">
          <FormCard title="تحويل بين المواقع" action={transferStock} submitLabel="تحويل">
            <label className="a-field">المنتج
              <select name="variant_id" className="a-in" required>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.product} — {variantLabel(v)} ({v.sku})</option>)}
              </select>
            </label>
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">من<select name="from" className="a-in">{locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
              <label className="a-field">إلى<select name="to" className="a-in" defaultValue={locs[1]?.id}>{locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
            </div>
            <label className="a-field">الكمية<input name="qty" type="number" min="1" className="a-in" required defaultValue={1} /></label>
            <label className="a-field">ملاحظة<input name="note" className="a-in" placeholder="تزويد المحل" /></label>
          </FormCard>
        </div>
      </div>
    </>
  );
}
