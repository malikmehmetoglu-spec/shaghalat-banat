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
        <Link href={`/p/${p.slug}`} className="btn secondary" target="_blank">عرضه في المتجر</Link>
      </div>
      {created && <div className="a-flash tone-success">تم إنشاء المنتج. أضيفي الآن المقاسات والألوان وكمياتها.</div>}
      <div className="split">
        <div className="wide"><ProductForm p={p} categories={cats ?? []} /></div>
        <div className="narrow">
          <VariantsEditor productId={p.id} slug={p.slug} variants={p.product_variants} locations={locations.filter((l) => l.kind !== "transit")} />
        </div>
      </div>
    </>
  );
}
