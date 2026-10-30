import Link from "next/link";
import { notFound } from "next/navigation";
import { getFx, getLocations, requireStaff } from "@/lib/admin";
import { Icon } from "@/components/Icon";
import { ProductForm } from "../ProductForm";
import { VariantsEditor } from "./VariantsEditor";
import { DeleteProduct } from "../DeleteProduct";

export const metadata = { title: "تعديل منتج" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; warn?: string }> }) {
  const { id } = await params;
  const { created, warn } = await searchParams;
  const { sb, profile } = await requireStaff();
  const [{ data: p }, { data: cats }, locations, fx] = await Promise.all([
    sb.from("products").select("*,product_categories(category_id),product_variants(id,sku,barcode,size,color_name,color_hex,stock_levels(location_id,on_hand,reserved))").eq("id", id).maybeSingle(),
    sb.from("categories").select("id,name").order("sort_order"),
    getLocations(), getFx(),
  ]);
  const { data: consignors } = await sb.from("consignors").select("id,name,mode,commission_pct").eq("is_active", true).order("name");
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
          {profile.role === "owner" && <DeleteProduct id={p.id} name={p.name} redirectTo="/admin/products" />}
        </div>
      </div>
      {warn && <div className="a-flash tone-danger">{warn}</div>}
      {created && !warn && (
        <div className="a-flash tone-success" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>تم إنشاء المنتج، وتولّد باركود لكل لون ومقاس تلقائياً.</span>
          <Link href={`/admin/barcodes/print?product=${p.id}`} className="btn" style={{ minHeight: 40 }}>اطبع الملصقات الآن</Link>
        </div>
      )}
      <VariantsEditor productId={p.id} slug={p.slug} variants={p.product_variants} locations={locations.filter((l) => l.kind !== "transit")} />
      <ProductForm p={{ ...p, category_ids: (p.product_categories ?? []).map((r: any) => r.category_id) }} categories={cats ?? []} locations={locations} rate={fx.rate} consignors={(consignors ?? []) as any} />
    </>
  );
}
