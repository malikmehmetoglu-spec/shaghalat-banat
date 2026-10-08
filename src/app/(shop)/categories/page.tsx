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

      <div className="grid-2">
        {cats.map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} className="pcard" style={{ height: 180, background: c.image_url ? `url(${c.image_url}) center/cover` : placeholder(c.slug), boxShadow: "0 10px 24px rgba(142,2,84,0.12)" }}>
            {!c.image_url && <span className="ph" style={{ bottom: 70 }}>{t("[صورة القسم]")}</span>}
            <span className="glass" style={{ padding: "10px 12px", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{c.name}</span>
              <span style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.9 }}>{c.count} {t("منتج")}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
