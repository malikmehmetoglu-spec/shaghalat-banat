import { homeSettings } from "@/lib/homeSettings";
import { Pic } from "@/components/Pic";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { HeroCarousel } from "@/components/HeroCarousel";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { DealCountdown } from "@/components/home/DealCountdown";
import { NewArrivals } from "@/components/home/NewArrivals";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { ScrollRow } from "@/components/home/ScrollRow";
import { getBanners, getCategories, getFavoriteIds, getProducts, getSampleReviewsForStaff, getStoreProfile, getTestimonials, getUnreadCount } from "@/lib/data";
import { placeholder } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  const t = await getT();
  const [cats, latest, favs, unread, banners, deals, best, realReviews, store, sampleReviews] = await Promise.all([
    getCategories(),
    getProducts({ sort: "new", limit: 24 }),
    getFavoriteIds(),
    getUnreadCount(),
    getBanners(),
    getProducts({ onSale: true }),
    getProducts({ sort: "best", limit: 10 }),
    getTestimonials(),
    getStoreProfile(),
    getSampleReviewsForStaff(),
  ]);
  const reviews: { id: string; name: string; city: string | null; body: string; rating: number; sample?: boolean }[] = [...realReviews, ...sampleReviews];

  // الأكثر مبيعاً يظهر بهذا الاسم فقط حين توجد مبيعات فعلية، وإلا «مختارات لكِ» بحسب التقييم
  const hasSales = best.some((p) => p.sold_count > 0);
  const picks = hasSales ? best.filter((p) => p.sold_count > 0) : [...latest].sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 10);
  // بانر التشكيلة: القسم الأغنى بالمنتجات
  const hs = homeSettings(store.home);
  const feature = hs.collect_show ? ((hs.collect_category && cats.find((c) => c.slug === hs.collect_category)) || [...cats].filter((c) => c.count > 0).sort((a, b) => b.count - a.count)[0]) : undefined;
  const featureImg = feature && (hs.collect_image || feature.image_url || (await getProducts({ categorySlug: feature.slug, sort: "new", limit: 6 })).find((p) => p.images?.[0])?.images[0]);
  const dealsEnd = hs.deals_ends_at ? new Date(hs.deals_ends_at).getTime() : null;
  const showDeals = hs.deals_show && deals.length > 0 && (!dealsEnd || dealsEnd > Date.now());
  const insta = latest.filter((p) => p.images?.[0]).slice(0, 6);
  const igHandle = store.instagram_url?.replace(/\/+$/, "").split("/").pop();

  return (
    <main className="page wide">
      <header className="m-head m-only">
        <div className="topbar">
          <Link href="/categories" className="icon-btn" aria-label={t("الأقسام")} style={{ boxShadow: "none", background: "transparent" }}>
            <Icon name="grid" size={22} />
          </Link>
          <Link href="/" className="home-logo"><img src="/icons/logo-horizontal.svg" alt={t("شغلات بنات")} /></Link>
          <Link href="/notifications" className="icon-btn" aria-label={t("الإشعارات")}>
            <Icon name="bell" />
            {unread > 0 && <span className="dot" />}
          </Link>
        </div>

        <SearchBar />
      </header>

      <HeroCarousel banners={banners} fallbackTitle={t("كل ما تحبّه البنات في مكان واحد")} />

      <section className="sec">
        <ScrollRow title={t("تسوّقي حسب القسم")} className="cat-row">
          {cats.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="cat-tile">
              <span className="arch cat-arch" style={{ background: placeholder(c.slug) }}>
                {c.image_url ? <Pic src={c.image_url} /> : <span className="cat-letter">{c.name[0]}</span>}
              </span>
              <span className="cat-name">{c.name}</span>
            </Link>
          ))}
        </ScrollRow>
      </section>

      {showDeals && (
        <section className="sec deals">
          <div className="deals-head">
            <div className="sec-head">
              <h2 className="sec-title"><Icon name="fire" size={22} stroke={2} /> {hs.deals_title || t("عروض اليوم")}</h2>
              <span className="sec-sub">{hs.deals_sub || t("خصومات حتى {n}% لفترة محدودة", { n: Math.round(Math.max(...deals.map((p) => (1 - p.price / Number(p.compare_at_price)) * 100))) })}</span>
            </div>
            <DealCountdown label={t("ينتهي خلال")} endsAt={dealsEnd} />
          </div>
          <div className="prow scr">
            {deals.slice(0, hs.deals_limit || 10).map((p) => (
              <div key={p.id} className="prow-item">
                <span className="off-badge ltr">-{Math.round((1 - p.price / Number(p.compare_at_price)) * 100)}%</span>
                <ProductCard p={p} isFav={favs.has(p.id)} />
              </div>
            ))}
          </div>
          <Link href="/search?sale=1" className="link-btn">{t("كل العروض ({n})", { n: deals.length })}</Link>
        </section>
      )}

      {picks.length > 0 && (
        <section className="sec">
          <div className="row-between">
            <div className="sec-head">
              <h2 className="sec-title">{hasSales ? t("الأكثر مبيعاً") : t("مختارات لكِ")}</h2>
              <span className="sec-sub">{hasSales ? t("ما اختارته البنات هذا الموسم") : t("قطع اخترناها لكِ بعناية")}</span>
            </div>
            <Link href="/search?sort=best" className="link-btn">{t("عرض الكل")}</Link>
          </div>
          <div className="prow scr">
            {picks.map((p, n) => (
              <div key={p.id} className="prow-item">
                {hasSales && <span className="rank-badge ltr">{n + 1}</span>}
                <ProductCard p={p} isFav={favs.has(p.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {feature && (
        <Link href={`/c/${feature.slug}`} className={`collect collect-${hs.collect_tone}`}>
          <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="collect-mark" />
          <span className="collect-text">
            <span className="hero-kicker">{hs.collect_kicker || t("تشكيلة مختارة")}</span>
            <span className="collect-title">{hs.collect_title || t("عالم {name}", { name: feature.name })}</span>
            <span className="collect-sub">{hs.collect_sub || t("{n} قطعة بانتظاركِ", { n: feature.count })}</span>
            <span className="btn cta collect-cta">{hs.collect_cta || t("اكتشفي التشكيلة")}</span>
          </span>
          <span className="arch collect-arch" style={{ background: placeholder(feature.slug) }}>
            {featureImg && <Pic src={featureImg} />}
          </span>
        </Link>
      )}

      <section className="sec">
        <div className="row-between">
          <h2 className="sec-title">{t("وصل حديثاً")}</h2>
          <Link href="/search" className="link-btn">{t("عرض الكل")}</Link>
        </div>
        <NewArrivals products={latest} cats={cats.map((c) => ({ id: c.id, name: c.name }))} favIds={[...favs]} />
      </section>

      <RecentlyViewed />

      {reviews.length > 0 && (
        <section className="sec">
          <div className="sec-head">
            <h2 className="sec-title">{t("قالوا عنّا")}</h2>
            <span className="sec-sub">{t("آراء زبوناتنا بكلماتهنّ")}</span>
          </div>
          <div className="rev-row scr">
            {reviews.map((r) => (
              <figure key={r.id} className={`rev${r.sample ? " rev-sample" : ""}`}>
                {r.sample && <span className="rev-tag">{t("تجريبي · يراه فريق العمل فقط")}</span>}
                <span className="rev-stars" aria-label={t("{n} من 5", { n: r.rating })}>{"★".repeat(r.rating)}<span>{"★".repeat(5 - r.rating)}</span></span>
                <blockquote>{r.body}</blockquote>
                <figcaption><b>{r.name}</b>{r.city && <span> · {r.city}</span>}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {store.instagram_url && insta.length >= 3 && (
        <section className="sec">
          <div className="row-between">
            <div className="sec-head">
              <h2 className="sec-title">{t("تابعينا على إنستغرام")}</h2>
              {igHandle && <span className="sec-sub ltr" style={{ alignSelf: "flex-end" }}>@{igHandle}</span>}
            </div>
            <a href={store.instagram_url} target="_blank" rel="noopener noreferrer" className="link-btn">{t("تابعينا")}</a>
          </div>
          <div className="ig-grid">
            {insta.map((p) => (
              <a key={p.id} href={store.instagram_url!} target="_blank" rel="noopener noreferrer" className="ig-tile" aria-label={t("إنستغرام")}>
                <Pic src={p.images[0]} alt="" />
                <span className="ig-ov"><Icon name="instagram" size={26} /></span>
              </a>
            ))}
          </div>
        </section>
      )}

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
