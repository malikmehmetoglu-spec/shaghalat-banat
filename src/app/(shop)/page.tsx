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

      <div className="m-only"><SearchBar /></div>

      <section className="hero">
        <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="hero-mark" />
        <div className="hero-text">
          {banner?.kicker && <span className="hero-kicker">{banner.kicker}</span>}
          <h1 className="hero-title">{banner?.title ?? t("كل ما تحبّه البنات في مكان واحد")}</h1>
          <Link href={banner?.link || "/search"} className="btn cta hero-cta">{t("تسوّقي الآن")}</Link>
        </div>
        <div className="arch hero-arch" style={{ background: banner?.image_url ? `url(${banner.image_url}) center/cover` : "linear-gradient(170deg,var(--banat-pink),var(--magenta) 55%,var(--deep-berry))" }} />
      </section>

      <section className="sec">
        <h2 className="sec-title">{t("تسوّقي حسب القسم")}</h2>
        <div className="cat-row scr">
          {cats.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="cat-tile">
              <span className="arch cat-arch" style={{ background: c.image_url ? `url(${c.image_url}) center/cover` : placeholder(c.slug) }}>
                {!c.image_url && <span className="cat-letter">{c.name[0]}</span>}
              </span>
              <span className="cat-name">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="row-between">
          <h2 className="sec-title">{t("وصل حديثاً")}</h2>
          <Link href="/search" className="link-btn">{t("عرض الكل")}</Link>
        </div>
        <div className="grid-2">
          {products.map((p) => <ProductCard key={p.id} p={p} isFav={favs.has(p.id)} />)}
        </div>
      </section>

      <section className="promise">
        {[
          { icon: "shield" as const, title: t("تغليف محايد"), text: t("لا شيء على الطرد يكشف ما بداخله") },
          { icon: "truck" as const, title: t("توصيل لباب البيت"), text: t("خلال 2 إلى 4 أيام داخل سوريا، والدفع عند الاستلام") },
          { icon: "return" as const, title: t("استبدال خلال 7 أيام"), text: t("بحالة المنتج الأصلية") },
        ].map((x) => (
          <div key={x.title} className="promise-item">
            <span className="promise-ic"><Icon name={x.icon} size={22} stroke={1.8} /></span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <b>{x.title}</b>
              <span>{x.text}</span>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
