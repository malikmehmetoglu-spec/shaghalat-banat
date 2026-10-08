import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { getCategories, getFavoriteIds, getProducts, getUnreadCount } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { placeholder } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  const t = await getT();
  const sb = await createClient();
  const [cats, products, favs, unread, banners] = await Promise.all([
    getCategories(),
    getProducts({ sort: "new", limit: 8 }),
    getFavoriteIds(),
    getUnreadCount(),
    sb.from("banners").select("id,kicker,title,link,image_url").eq("is_active", true).order("sort_order").limit(1),
  ]);
  const banner = banners.data?.[0];

  return (
    <main className="page wide">
      <div className="topbar m-only">
        <Link href="/categories" className="icon-btn" aria-label={t("الأقسام")} style={{ boxShadow: "none", background: "transparent" }}>
          <Icon name="grid" size={22} />
        </Link>
        <img src="/icons/logo-horizontal.svg" alt={t("شغلات بنات")} style={{ height: 36, width: "auto" }} />
        <Link href="/notifications" className="icon-btn" aria-label={t("الإشعارات")}>
          <Icon name="bell" />
          {unread > 0 && <span className="dot" />}
        </Link>
      </div>

      <div className="row-between">
        <div className="title-block">
          <h1 className="h-display">{t("اكتشفي")}</h1>
          <p className="muted">{t("تسوّقي")} <b style={{ color: "var(--magenta)", fontWeight: 600 }}>{t("تشكيلتنا الجديدة")}</b></p>
        </div>
      </div>

      <div className="chips scr" style={{ gap: 18 }}>
        {cats.map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0, color: "var(--dark-plum)" }}>
            <span style={{ display: "block", padding: 3, borderRadius: "50%", border: "2px solid var(--light-blush)" }}>
              <span style={{ width: 58, height: 58, borderRadius: "50%", background: c.image_url ? `url(${c.image_url}) center/cover` : placeholder(c.slug), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
                {!c.image_url && c.name[0]}
              </span>
            </span>
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>{c.name}</span>
          </Link>
        ))}
      </div>

      <div className="m-only"><SearchBar /></div>

      {banner && (
        <div className="banner">
          <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            {banner.kicker && <span className="kicker">{banner.kicker}</span>}
            <div className="t">{banner.title}</div>
            {banner.link && <Link href={banner.link} className="go">{t("تسوّقي الآن")}</Link>}
          </div>
          <div style={{ width: 104, height: 140, flexShrink: 0, borderRadius: 20, background: banner.image_url ? `url(${banner.image_url}) center/cover` : "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.3)" }} />
        </div>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="row-between">
          <h2 className="h-section">{t("وصل حديثاً")}</h2>
          <Link href="/search" className="link-btn">{t("عرض الكل")}</Link>
        </div>
        <div className="grid-2">
          {products.map((p) => <ProductCard key={p.id} p={p} isFav={favs.has(p.id)} />)}
        </div>
      </section>
    </main>
  );
}
