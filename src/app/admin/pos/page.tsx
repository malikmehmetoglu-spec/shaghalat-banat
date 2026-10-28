import { getLocations, requireStaff } from "@/lib/admin";
import { cell, loadVariants, variantLabel } from "@/lib/inventory";
import { POS } from "./POS";

export const metadata = { title: "نقطة البيع" };

export default async function PosPage() {
  const { sb, profile } = await requireStaff();
  const [locs, all, { data: settings }, { data: shiftRows }] = await Promise.all([
    getLocations(), loadVariants(sb),
    sb.from("finance_settings").select("store_address,store_phone,invoice_footer,tax_number").eq("id", 1).maybeSingle(),
    sb.rpc("shift_summary"),
  ]);
  const { data: last } = await sb.from("cash_shifts").select("counted").not("closed_at", "is", null).order("closed_at", { ascending: false }).limit(1).maybeSingle();
  const sh = (shiftRows as any[] | null)?.[0];
  const store = locs.find((l) => l.kind === "store");
  const items = all.map((v) => ({ id: v.id, name: v.product, label: variantLabel(v), sku: v.sku, barcode: v.barcode, price: v.price, image: v.image, slug: v.slug, stock: store ? cell(v, store.id).on_hand : 0 }));
  if (!store) return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <h1 className="adm-h1">نقطة البيع</h1>
      <span className="caption" style={{ lineHeight: 1.8 }}>لا يوجد محل بعد. أضيفي موقعاً من نوع «محل» أولاً، ثم أضيفي المنتجات وكمياتها، وبعدها تعمل نقطة البيع.</span>
      <a className="btn" href="/admin/inventory/locations">إضافة محل</a>
    </div>
  );
  return (
    <POS items={items} storeName={store?.name ?? "المحل"} cashier={profile.full_name || ""}
      shop={{ address: settings?.store_address ?? "", phone: settings?.store_phone ?? "", footer: settings?.invoice_footer ?? "شكراً لتسوّقك من شغلات بنات", taxNumber: settings?.tax_number ?? "" }}
      lastCounted={last?.counted != null ? Number(last.counted) : null}
      shift={sh?.shift_id ? { openedAt: sh.opened_at, by: sh.opened_by_name, opening: Number(sh.opening), sales: Number(sh.cash_sales), expenses: Number(sh.cash_expenses), draws: Number(sh.cash_draws ?? 0), expected: Number(sh.expected) } : null} />
  );
}
