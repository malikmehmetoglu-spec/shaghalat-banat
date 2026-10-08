import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { getFavoriteIds, getProducts, type SortKey } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { placeholder } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "new", label: "الأحدث" },
  { key: "best", label: "الأكثر مبيعاً" },
  { key: "price_asc", label: "السعر: الأقل أولاً" },
  { key: "price_desc", label: "السعر: الأعلى أولاً" },
];

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string }> }) {
  const t = await getT();
  const { slug } = await params;
  const { sort = "new" } = await searchParams;
  const sb = await createClient();
  const { data: cat } = await sb.from("categories").select("id,name,name_en,slug,image_url").eq("slug", slug).maybeSingle();
  if (!cat) notFound();
  const [products, favs] = await Promise.all([getProducts({ categorySlug: slug, sort: sort as SortKey }), getFavoriteIds()]);

  return (
    <main className="page tight wide" style={{ paddingBottom: 40 }}>
      <div className="topbar m-only">
        <Link href="/categories" className="icon-btn" aria-label={t("رجوع")}><Icon name="back" stroke={2} /></Link>
        <span />
        <Link href="/search" className="icon-btn" aria-label={t("بحث")}><Icon name="search" stroke={2} /></Link>
      </div>
      <section className="cat-hero">
        <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="hero-mark" />
        <div className="cat-hero-text">
          <h1 className="hero-title" style={{ margin: 0 }}>{(t("ل.س") !== "ل.س" && cat.name_en) || cat.name}</h1>
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
          {products.map((p) => <ProductCard key={p.id} p={p} isFav={favs.has(p.id)} />)}
        </div>
      ) : (
        <div className="empty">
          <span className="ring"><Icon name="grid" size={40} stroke={1.6} /></span>
          <div className="title-block"><span className="h-section">{t("لا توجد منتجات بعد")}</span><span className="muted">{t("سنضيف قطعاً جديدة قريباً")}</span></div>
        </div>
      )}
    </main>
  );
}
