import type { SupabaseClient } from "@supabase/supabase-js";

export type StockCell = { on_hand: number; reserved: number; reorder_point: number };
export type VariantRow = {
  id: string; sku: string; barcode: string | null; size: string | null; color_name: string | null;
  product_id: string; product: string; slug: string; price: number; image: string | null;
  stock: Record<string, StockCell>;
};

/** كل المتغيرات مع مخزونها في كل موقع */
export async function loadVariants(sb: SupabaseClient): Promise<VariantRow[]> {
  const { data } = await sb
    .from("product_variants")
    .select("id,sku,barcode,size,color_name,price_override,product:products(id,name,slug,price,images),stock_levels(location_id,on_hand,reserved,reorder_point)")
    .order("sku");
  return (data ?? []).map((v: any) => ({
    id: v.id, sku: v.sku, barcode: v.barcode, size: v.size, color_name: v.color_name,
    product_id: v.product?.id, product: v.product?.name ?? "", slug: v.product?.slug ?? "",
    price: Number(v.price_override ?? v.product?.price ?? 0), image: v.product?.images?.[0] ?? null,
    stock: Object.fromEntries((v.stock_levels ?? []).map((s: any) => [s.location_id, { on_hand: s.on_hand, reserved: s.reserved, reorder_point: s.reorder_point }])),
  }));
}

export const variantLabel = (v: Pick<VariantRow, "size" | "color_name">) => [v.color_name, v.size].filter(Boolean).join(" · ");
export const cell = (v: VariantRow, loc: string): StockCell => v.stock[loc] ?? { on_hand: 0, reserved: 0, reorder_point: 5 };
