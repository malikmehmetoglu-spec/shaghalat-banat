import { requireStaff } from "@/lib/admin";
import { loadVariants, variantLabel } from "@/lib/inventory";
import { Labels } from "./Labels";

export const metadata = { title: "الباركود والملصقات" };

export default async function BarcodesPage() {
  const { sb } = await requireStaff();
  const all = await loadVariants(sb);
  return <Labels items={all.map((v) => ({ id: v.id, name: v.product, label: variantLabel(v), code: v.barcode || v.sku, price: v.price }))} />;
}
