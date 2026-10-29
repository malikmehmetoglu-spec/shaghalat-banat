import { decodeSlug } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { getCategories, getFavoriteIds, getProducts, type SortKey } from "@/lib/data";
import { MoreLink } from "@/components/MoreLink";
import { shownCount } from "@/lib/paging";
import { placeholder } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "new", label: "الأحدث" },
  { key: "best", label: "الأكثر مبيعاً" },
  { key: "price_asc", label: "السعر: الأقل أولاً" },
  { key: "price_desc", label: "السعر: الأعلى أولاً" },
];

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string; n?: string }> }) {
  const t = await getT();
  const slug = decodeSlug((await params).slug);
  const { sort = "new", n } = await searchParams;
  const [cats, products, favs] = await Promise.all([getCategories(), getProducts({ categorySlug: slug, sort: sort as SortKey }), getFavoriteIds()]);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();
  const shown = shownCount(n);

  return (
    <main className="page tight wide" style={{ paddingBottom: 40 }}>
      <div className="topbar m-only">
        <Link href="/categories" className="icon-btn" aria-label={t("رجوع")}><Icon name="back" stroke={2} /></Link>
        <Link href="/" className="ph-logo" aria-label="شغلات بنات"><img src="/icons/logo-mark.svg" alt="" /></Link>
        <Link href="/search" className="icon-btn" aria-label={t("بحث")}><Icon name="search" stroke={2} /></Link>
      </div>
      <section className="cat-hero">
        <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="hero-mark" />
        <div className="cat-hero-text">
          <h1 className="hero-title" style={{ margin: 0 }}>{cat.name}</h1>
          <span className="muted">{products.length} {t("منتج")}</span>
        </div>
        <span className="arch cat-hero-arch" style={{ background: cat.image_url ? `url(${cat.image_url}) center/cover` : placeholder(cat.slug) }} />
      </section>

      <div className="chips scr" role="tablist" aria-label={t("ترتيب حسب")}>
        {SORTS.map((s) => (
          <Link key={s.key} href={`/c/${slug}?sort=${s.key}`} className={`chip${sort === s.key ? " on" : ""}`} role="tab" aria-selected={sort === s.key}>
            {t(s.label)}
          </Link>
        ))}
      </div>

      {products.length ? (
        <div className="grid-2">
          {products.slice(0, shown).map((p) => <ProductCard key={p.id} p={p} isFav={favs.has(p.id)} />)}
        </div>
      ) : null}
      {products.length > 0 && <MoreLink href={`/c/${slug}?sort=${sort}&n=${shown + 24}`} shown={shown} total={products.length} label={t("عرض المزيد ({n})", { n: products.length - shown })} />}
      {!products.length && (
        <div className="empty">
          <span className="ring"><Icon name="grid" size={40} stroke={1.6} /></span>
          <div className="title-block"><span className="h-section">{t("لا توجد منتجات بعد")}</span><span className="muted">{t("سنضيف قطعاً جديدة قريباً")}</span></div>
        </div>
      )}
    </main>
  );
}
