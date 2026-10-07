import { getLocations, requireStaff } from "@/lib/admin";
import { date, price } from "@/lib/format";
import { loadVariants, variantLabel } from "@/lib/inventory";
import { FormCard } from "../../FormCard";
import { addSupplier } from "../../actions";
import { NewPO, ReceiveButton } from "./PO";

export const metadata = { title: "الموردون والمشتريات" };
const ST: Record<string, [string, string]> = { draft: ["مسودة", "tone-neutral"], sent: ["بانتظار الاستلام", "tone-warning"], partial: ["استلام جزئي", "tone-info"], received: ["مستلم", "tone-success"], cancelled: ["ملغى", "tone-neutral"] };

export default async function SuppliersPage() {
  const { sb } = await requireStaff();
  const [{ data: sups }, { data: pos }, locs, variants] = await Promise.all([
    sb.from("suppliers").select("id,name,category,phone,lead_days").order("name"),
    sb.from("purchase_orders").select("id,number,status,created_at,received_at,note,supplier:suppliers(name),location:locations(name),po_items(qty,unit_cost)").order("created_at", { ascending: false }).limit(50),
    getLocations(), loadVariants(sb),
  ]);

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الموردون والمشتريات</h1><span className="adm-sub">أوامر الشراء تضيف البضاعة للمخزون عند الاستلام</span></div></div>
      <div className="acard flush">
        <h2 className="adm-h2" style={{ padding: "12px 14px 4px" }}>أوامر الشراء</h2>
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>الرقم</th><th>المورد</th><th>إلى</th><th style={{ textAlign: "center" }}>القطع</th><th>التكلفة</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {(pos ?? []).map((p: any) => {
                const qty = p.po_items.reduce((s: number, i: any) => s + i.qty, 0);
                const cost = p.po_items.reduce((s: number, i: any) => s + i.qty * Number(i.unit_cost), 0);
                return (
                  <tr key={p.id}>
                    <td className="ltr" style={{ textAlign: "right", fontWeight: 600 }}>{p.number}</td>
                    <td>{p.supplier?.name}</td><td className="caption">{p.location?.name}</td>
                    <td style={{ textAlign: "center" }}>{qty}</td><td>{price(cost)}</td>
                    <td className="caption">{date(p.received_at ?? p.created_at)}</td>
                    <td><span className={`pill ${ST[p.status][1]}`}>{ST[p.status][0]}</span></td>
                    <td>{(p.status === "sent" || p.status === "partial") && <ReceiveButton id={p.id} />}</td>
                  </tr>
                );
              })}
              {!pos?.length && <tr><td colSpan={8} className="caption" style={{ textAlign: "center", padding: 24 }}>لا توجد أوامر شراء بعد</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="split">
        <div className="wide">
          <NewPO suppliers={(sups ?? []).map((s) => ({ id: s.id, name: s.name }))} locations={locs.map((l) => ({ id: l.id, name: l.name }))}
            variants={variants.map((v) => ({ id: v.id, label: `${v.product} — ${variantLabel(v)} (${v.sku})` }))} />
        </div>
        <div className="narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="adm-h2">الموردون</h2>
            {(sups ?? []).map((s) => (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", borderRadius: 16, border: "1px solid var(--border-row)" }}>
                <span style={{ fontWeight: 600, lineHeight: 1.5 }}>{s.name}</span>
                <span className="caption">{[s.category, s.lead_days ? `توريد خلال ${s.lead_days} يوم` : null].filter(Boolean).join(" · ")}</span>
                {s.phone && <span className="caption ltr" style={{ textAlign: "right" }}>{s.phone}</span>}
              </div>
            ))}
          </div>
          <FormCard title="مورد جديد" action={addSupplier} submitLabel="إضافة المورد">
            <label className="a-field">الاسم<input name="name" className="a-in" required /></label>
            <div className="a-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label className="a-field">الفئة<input name="category" className="a-in" placeholder="عبايات" /></label>
              <label className="a-field">مدة التوريد (يوم)<input name="lead_days" type="number" min="0" className="a-in" /></label>
            </div>
            <label className="a-field">الهاتف<input name="phone" className="a-in ltr" /></label>
          </FormCard>
        </div>
      </div>
    </>
  );
}
