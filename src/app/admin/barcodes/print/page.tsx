import { requireStaff } from "@/lib/admin";
import { loadVariants, variantLabel } from "@/lib/inventory";
import { PrintLabels } from "./PrintLabels";

export const metadata = { title: "طباعة الملصقات" };

/** ?product=ID (كل قطع منتج) أو ?items=variantId:qty,variantId:qty */
export default async function PrintPage({ searchParams }: { searchParams: Promise<{ product?: string; items?: string }> }) {
  const { product, items } = await searchParams;
  const { sb } = await requireStaff();
  const all = await loadVariants(sb);
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
