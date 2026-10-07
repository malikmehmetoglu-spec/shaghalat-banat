import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "المفضلة" };

export default async function FavoritesPage() {
  const t = await getT();
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const { data } = await sb.from("favorites")
    .select("product:products(id,slug,name,subtitle,description,price,compare_at_price,tag,images,rating,rating_count,category_id,created_at,sold_count)")
    .eq("user_id", u.user!.id).order("created_at", { ascending: false });
  const items = (data ?? []).map((f: any) => f.product as Product).filter(Boolean);

  return (
    <main className="page">
      <div className="title-block">
        <h1 className="h-display">{t("المفضلة")}</h1>
        <p className="muted">{items.length ? t("{n} منتجات محفوظة", { n: items.length }) : t("لا توجد منتجات محفوظة")}</p>
      </div>
      {items.length ? (
        <div className="grid-2">{items.map((p) => <ProductCard key={p.id} p={p} isFav />)}</div>
      ) : (
        <div className="empty">
          <span className="ring"><Icon name="heart" size={40} stroke={1.6} /></span>
          <div className="title-block"><span className="h-section">{t("قائمتك فارغة")}</span><span className="muted">{t("اضغطي على القلب في أي منتج ليظهر هنا")}</span></div>
          <Link href="/" className="btn" style={{ height: 48, padding: "0 28px" }}>{t("تسوّقي الآن")}</Link>
        </div>
      )}
    </main>
  );
}
