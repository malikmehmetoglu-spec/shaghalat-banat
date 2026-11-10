import { requireStaff } from "@/lib/admin";
import { loadVariants, variantLabel } from "@/lib/inventory";
import { PrintLabels } from "./PrintLabels";

export const metadata = { title: "طباعة الملصقات" };

/** ?product=ID (كل قطع منتج) · ?items=variantId:qty,... · ?cat=ID (كل قسم: ملصق لكل قطعة موجودة في المخزون) */
export default async function PrintPage({ searchParams }: { searchParams: Promise<{ product?: string; items?: string; cat?: string }> }) {
  const { product, items, cat } = await searchParams;
  const { sb } = await requireStaff();
  const all = await loadVariants(sb);
  if (cat) {
    const { data: rows } = await sb.from("product_categories").select("product_id").eq("category_id", cat);
    const ids = new Set((rows ?? []).map((r) => r.product_id as string));
    const list = all
      .filter((v) => ids.has(v.product_id) && Number(v.price) > 0)
      .map((v) => {
        const stock = Object.values(v.stock).reduce((s, c) => s + c.on_hand, 0);
        return { id: v.id, name: v.product, label: variantLabel(v), code: v.barcode || v.sku, price: v.price, stock, qty: stock };
      })
      .filter((v) => v.stock > 0);
    return <PrintLabels items={list} initialMode="stock" />;
  }
  const wanted = new Map((items ?? "").split(",").filter(Boolean).map((p) => { const [id, q] = p.split(":"); return [id, Math.max(1, Number(q) || 1)] as const; }));
  const list = all
    .filter((v) => (product ? v.product_id === product : wanted.has(v.id)))
    .map((v) => ({
      id: v.id, name: v.product, label: variantLabel(v), code: v.barcode || v.sku, price: v.price,
      stock: Object.values(v.stock).reduce((s, c) => s + c.on_hand, 0),
      qty: wanted.get(v.id) ?? 1,
    }));
  return <PrintLabels items={list} />;
}
