import Link from "next/link";
import { getLocations, requireStaff } from "@/lib/admin";
import { cell, loadVariants, variantLabel } from "@/lib/inventory";

export const metadata = { title: "تنبيهات النقص" };

export default async function AlertsPage() {
  const { sb } = await requireStaff();
  const [locs, all] = await Promise.all([getLocations(), loadVariants(sb)]);
  const alerts = all.flatMap((v) => locs.map((l) => {
    const c = cell(v, l.id); const avail = c.on_hand - c.reserved;
    return avail <= c.reorder_point ? { v, l, c, avail, suggest: Math.max(c.reorder_point * 2 - avail, 1) } : null;
  }).filter(Boolean) as any[]).sort((a, b) => a.avail - b.avail);
  const out = alerts.filter((a) => a.avail <= 0).length;

  return (
    <>
      <div className="adm-top">
        <div className="title-block"><h1 className="adm-h1">تنبيهات النقص</h1><span className="adm-sub">{out} نفد · {alerts.length - out} قارب على النفاد</span></div>
        <Link href="/admin/inventory/suppliers" className="btn">إنشاء أمر شراء</Link>
      </div>
      <div className="acard flush">
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>المنتج</th><th>الموقع</th><th style={{ textAlign: "center" }}>المتاح</th><th style={{ textAlign: "center" }}>حد إعادة الطلب</th><th style={{ textAlign: "center" }}>كمية مقترحة</th><th>الحالة</th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.v.id + a.l.id}>
                  <td><Link className="rowlink" href={`/admin/products/${a.v.product_id}`}>{a.v.product}</Link><div className="caption">{variantLabel(a.v)} · <span className="ltr">{a.v.sku}</span></div></td>
                  <td>{a.l.name}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{a.avail}</td>
                  <td style={{ textAlign: "center" }} className="caption">{a.c.reorder_point}</td>
                  <td style={{ textAlign: "center" }}>{a.suggest}</td>
                  <td><span className={`pill ${a.avail <= 0 ? "tone-danger" : "tone-warning"}`}>{a.avail <= 0 ? "نفد" : "منخفض"}</span></td>
                </tr>
              ))}
              {!alerts.length && <tr><td colSpan={6} className="caption" style={{ textAlign: "center", padding: 24 }}>كل الكميات بخير 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
