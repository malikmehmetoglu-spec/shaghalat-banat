import Link from "next/link";
import { getLocations, requireStaff } from "@/lib/admin";
import { Icon } from "@/components/Icon";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "منتج جديد" };

export default async function NewProduct() {
  const { sb } = await requireStaff();
  const [{ data: cats }, locations] = await Promise.all([sb.from("categories").select("id,name").order("sort_order"), getLocations()]);
  return (
    <>
      <div className="adm-top">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/admin/products" className="icon-btn" aria-label="رجوع" style={{ width: 44, height: 44, boxShadow: "none", border: "1px solid var(--border-soft)" }}><Icon name="back" stroke={2} /></Link>
          <div className="title-block"><h1 className="adm-h1">منتج جديد</h1><span className="adm-sub">المعلومات، الصور، ثم الألوان والمقاسات وعدد القطع — كلها في صفحة واحدة</span></div>
        </div>
      </div>
      <ProductForm categories={cats ?? []} locations={locations} />
    </>
  );
}
