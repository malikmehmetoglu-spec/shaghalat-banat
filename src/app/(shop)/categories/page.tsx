import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CartBadgeLink } from "@/components/CartBadgeLink";
import { getCategories } from "@/lib/data";
import { placeholder } from "@/lib/format";

export const metadata = { title: "الأقسام" };

export default async function CategoriesPage() {
  const cats = await getCategories();
  return (
    <main className="page">
      <div className="row-between">
        <div className="title-block">
          <h1 className="h-display">الأقسام</h1>
          <p className="muted">كل ما تحتاجينه في مكان واحد</p>
        </div>
        <CartBadgeLink />
      </div>

      <form action="/search" className="search" role="search">
        <label htmlFor="qc" className="sr">ابحثي في الأقسام</label>
        <input id="qc" name="q" placeholder="ابحثي في المنتجات…" />
        <button type="submit" className="go" aria-label="بحث"><Icon name="search" stroke={2} /></button>
      </form>

      <div className="grid-2">
        {cats.map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} className="pcard" style={{ height: 180, background: c.image_url ? `url(${c.image_url}) center/cover` : placeholder(c.slug), boxShadow: "0 10px 24px rgba(142,2,84,0.12)" }}>
            {!c.image_url && <span className="ph" style={{ bottom: 70 }}>[صورة القسم]</span>}
            <span className="glass" style={{ padding: "10px 12px", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{c.name}</span>
              <span style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.9 }}>{c.count} منتج</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
