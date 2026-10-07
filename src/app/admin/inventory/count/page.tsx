import Link from "next/link";
import { getLocations, requireStaff } from "@/lib/admin";
import { cell, loadVariants, variantLabel } from "@/lib/inventory";
import { CountSheet } from "./CountSheet";

export const metadata = { title: "الجرد" };

export default async function CountPage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const { loc } = await searchParams;
  const { sb } = await requireStaff();
  const [locs, all] = await Promise.all([getLocations(), loadVariants(sb)]);
  const cur = locs.find((l) => l.id === loc) ?? locs[0];
  const lines = all.map((v) => ({ id: v.id, name: v.product, label: variantLabel(v), sku: v.sku, barcode: v.barcode, system: cur ? cell(v, cur.id).on_hand : 0 }));

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الجرد والتسويات</h1><span className="adm-sub">أدخلي الكمية الفعلية؛ الفروقات تُسجّل كتسوية عند الاعتماد</span></div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {locs.map((l) => <Link key={l.id} href={`/admin/inventory/count?loc=${l.id}`} className={`a-chip${cur?.id === l.id ? " on" : ""}`}>{l.name}</Link>)}
      </div>
      {cur && <CountSheet key={cur.id} locationId={cur.id} locationName={cur.name} lines={lines} />}
    </>
  );
}
