import { getLocations, requireStaff } from "@/lib/admin";
import { cell, loadVariants, variantLabel } from "@/lib/inventory";
import { POS } from "./POS";

export const metadata = { title: "نقطة البيع" };

export default async function PosPage() {
  const { sb, profile } = await requireStaff();
  const [locs, all] = await Promise.all([getLocations(), loadVariants(sb)]);
  const store = locs.find((l) => l.kind === "store");
  const items = all.map((v) => ({ id: v.id, name: v.product, label: variantLabel(v), sku: v.sku, barcode: v.barcode, price: v.price, image: v.image, slug: v.slug, stock: store ? cell(v, store.id).on_hand : 0 }));
  return <POS items={items} storeName={store?.name ?? "المحل"} cashier={profile.full_name || ""} />;
}
