import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocations, requireStaff } from "@/lib/admin";
import { Icon } from "@/components/Icon";
import { ProductForm } from "../ProductForm";
import { VariantsEditor } from "./VariantsEditor";

export const metadata = { title: "تعديل منتج" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const { sb } = await requireStaff();
  const [{ data: p }, { data: cats }, locations] = await Promise.all([
    sb.from("products").select("*,product_variants(id,sku,barcode,size,color_name,color_hex,stock_levels(location_id,on_hand,reserved))").eq("id", id).maybeSingle(),
    sb.from("categories").select("id,name").order("sort_order"),
    getLocations(),
  ]);
  if (!p) notFound();

  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/admin/products" className="icon-btn" aria-label="رجوع" style={{ width: 44, height: 44, boxShadow: "none", border: "1px solid var(--border-soft)" }}><Icon name="back" stroke={2} /></Link>
          <div className="title-block"><h1 className="adm-h1">{p.name}</h1><span className="adm-sub">تعديل منتج</span></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/admin/barcodes/print?product=${p.id}`} className="btn">طباعة ملصقات الباركود</Link>
          <Link href={`/p/${p.slug}`} className="btn secondary" target="_blank">عرضه في المتجر</Link>
        </div>
      </div>
      {created && (
        <div className="a-flash tone-success" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>تم إنشاء المنتج، وتولّد باركود لكل لون ومقاس تلقائياً.</span>
          <Link href={`/admin/barcodes/print?product=${p.id}`} className="btn" style={{ minHeight: 40 }}>اطبع الملصقات الآن</Link>
        </div>
      )}
      <div className="split">
        <div className="wide"><ProductForm p={p} categories={cats ?? []} locations={locations} /></div>
        <div className="narrow">
          <VariantsEditor productId={p.id} slug={p.slug} variants={p.product_variants} locations={locations.filter((l) => l.kind !== "transit")} />
        </div>
      </div>
    </>
  );
}
