import { requireStaff } from "@/lib/admin";
import { loadVariants, variantLabel } from "@/lib/inventory";
import { Labels } from "./Labels";
import { InventoryTabs } from "../InventoryTabs";

export const metadata = { title: "الباركود والملصقات" };

export default async function BarcodesPage() {
  const { sb, profile } = await requireStaff();
  const all = await loadVariants(sb);
  return <><InventoryTabs role={profile.role} /><Labels items={all.map((v) => ({ id: v.id, name: v.product, label: variantLabel(v), code: v.barcode || v.sku, price: v.price }))} /></>;
}
