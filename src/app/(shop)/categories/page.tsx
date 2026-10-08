import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CartBadgeLink } from "@/components/CartBadgeLink";
import { getCategories } from "@/lib/data";
import { placeholder } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "الأقسام" };

export default async function CategoriesPage() {
  const t = await getT();
  const cats = await getCategories();
  return (
    <main className="page wide">
      <div className="row-between">
        <div className="title-block">
          <h1 className="h-display">{t("الأقسام")}</h1>
          <p className="muted">{t("كل ما تحتاجينه في مكان واحد")}</p>
        </div>
        <span className="m-only"><CartBadgeLink /></span>
      </div>

      <form action="/search" className="search m-only" role="search">
        <label htmlFor="qc" className="sr">{t("ابحثي في الأقسام")}</label>
        <input id="qc" name="q" placeholder={t("ابحثي في المنتجات…")} />
        <button type="submit" className="go" aria-label={t("بحث")}><Icon name="search" stroke={2} /></button>
      </form>

      <div className="cat-grid">
        {cats.map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} className="cat-card">
            <span className="arch cat-card-arch" style={{ background: c.image_url ? `url(${c.image_url}) center/cover` : placeholder(c.slug) }}>
              {!c.image_url && <span className="cat-letter">{c.name[0]}</span>}
            </span>
            <span className="cat-card-name">{c.name}</span>
            <span className="caption">{c.count} {t("منتج")}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
