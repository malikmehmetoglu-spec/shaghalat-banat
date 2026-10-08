import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getProducts } from "@/lib/data";
import { placeholder, price } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "البحث" };

const POPULAR = ["عبايات", "لانجري", "عطر", "بيجاما", "روب", "ساتان"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getT();
  const { q = "" } = await searchParams;
  const term = q.trim();
  const results = term ? await getProducts({ q: term }) : await getProducts({ sort: "new" });

  return (
    <main className="page wide" style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" className="icon-btn" aria-label={t("رجوع")}><Icon name="back" stroke={2} /></Link>
        <form action="/search" role="search" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, height: 52, paddingInlineStart: 18, paddingInlineEnd: 6, borderRadius: 26, border: "1.5px solid var(--magenta)" }}>
          <span style={{ color: "var(--magenta)", display: "flex" }}><Icon name="search" size={18} stroke={2} /></span>
          <label htmlFor="sq" className="sr">{t("بحث")}</label>
          <input id="sq" name="q" defaultValue={term} autoFocus placeholder={t("ابحثي عن منتج…")} style={{ flex: 1, minWidth: 0, height: 40, border: "none", outline: "none", fontSize: 14, background: "transparent" }} />
        </form>
      </div>

      {!term && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h-section">{t("الأكثر بحثاً")}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {POPULAR.map((w) => <Link key={w} href={`/search?q=${encodeURIComponent(t(w))}`} className="chip">{t(w)}</Link>)}
          </div>
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p className="muted">{term ? (results.length ? t("{n} نتائج", { n: results.length }) : t("لا توجد نتائج، جرّبي كلمة أخرى")) : t("كل المنتجات")}</p>
        {results.map((p) => (
          <Link key={p.id} href={`/p/${p.slug}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: 10, borderRadius: 20, border: "1px solid var(--light-blush)", color: "var(--dark-plum)" }}>
            <span style={{ width: 64, height: 76, flexShrink: 0, borderRadius: 14, background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : placeholder(p.slug) }} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{p.name}</span>
              <span className="caption">{p.subtitle}</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: "var(--magenta)", flexShrink: 0 }}>{price(p.price, t)}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
