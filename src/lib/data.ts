import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/i18n/server";
import type { Category, Product, ProductWithVariants } from "@/lib/types";

const PRODUCT_COLS = "id,slug,name,name_en,subtitle,description,price,compare_at_price,tag,images,rating,rating_count,category_id,created_at,sold_count";

/** بالإنجليزية: نستخدم name_en إن وُجد */
async function localize<T extends { name: string; name_en?: string | null }>(rows: T[]): Promise<T[]> {
  if ((await getLang()) !== "en") return rows;
  return rows.map((r) => (r.name_en ? { ...r, name: r.name_en } : r));
}

export async function getCategories(): Promise<(Category & { count: number })[]> {
  const sb = await createClient();
  const { data } = await sb.from("categories").select("id,slug,name,name_en,image_url,sort_order,products(count)").order("sort_order");
  return localize((data ?? []).map((c: any) => ({ ...c, count: c.products?.[0]?.count ?? 0 })));
}

export type SortKey = "new" | "best" | "price_asc" | "price_desc";

export async function getProducts(opts: { categorySlug?: string; sort?: SortKey; q?: string; limit?: number } = {}): Promise<Product[]> {
  const sb = await createClient();
  let query = sb.from("products").select(opts.categorySlug ? `${PRODUCT_COLS},categories!inner(slug)` : PRODUCT_COLS).is("archived_at", null);
  if (opts.categorySlug) query = query.eq("categories.slug", opts.categorySlug);
  if (opts.q) {
    const term = opts.q.replace(/[%,()]/g, " ").trim();
    query = query.or(`name.ilike.%${term}%,subtitle.ilike.%${term}%,description.ilike.%${term}%`);
  }
  switch (opts.sort) {
    case "best": query = query.order("sold_count", { ascending: false }); break;
    case "price_asc": query = query.order("price", { ascending: true }); break;
    case "price_desc": query = query.order("price", { ascending: false }); break;
    default: query = query.order("created_at", { ascending: false });
  }
  if (opts.limit) query = query.limit(opts.limit);
  const { data } = await query;
  return localize((data ?? []) as unknown as Product[]);
}

export async function getProduct(slug: string): Promise<ProductWithVariants | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("products")
    .select(`${PRODUCT_COLS},product_variants(id,sku,size,color_name,color_hex,price_override)`)
    .eq("slug", slug)
    .is("archived_at", null)
    .maybeSingle();
  if (!data) return null;
  const ids = (data as any).product_variants.map((v: any) => v.id);
  const { data: avail } = await sb.from("variant_availability").select("variant_id,online_available").in("variant_id", ids);
  const map = new Map((avail ?? []).map((a: any) => [a.variant_id, a.online_available]));
  const [loc] = await localize([data as any]);
  return {
    ...loc,
    product_variants: (data as any).product_variants.map((v: any) => ({ ...v, available: map.get(v.id) ?? 0 })),
  };
}

export async function getUser() {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function getFavoriteIds(): Promise<Set<string>> {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return new Set();
  const { data } = await sb.from("favorites").select("product_id").eq("user_id", u.user.id);
  return new Set((data ?? []).map((f) => f.product_id));
}

export async function getUnreadCount(): Promise<number> {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return 0;
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).eq("is_read", false);
  return count ?? 0;
}
