import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getProducts } from "@/lib/data";
import { placeholder, price } from "@/lib/format";

export const metadata = { title: "البحث" };

const POPULAR = ["عبايات", "لانجري", "عطر", "بيجاما", "روب", "ساتان"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const results = term ? await getProducts({ q: term }) : await getProducts({ sort: "new" });

  return (
    <main className="page" style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" className="icon-btn" aria-label="رجوع"><Icon name="back" stroke={2} /></Link>
        <form action="/search" role="search" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 18px 0 6px", borderRadius: 26, border: "1.5px solid var(--magenta)" }}>
          <span style={{ color: "var(--magenta)", display: "flex" }}><Icon name="search" size={18} stroke={2} /></span>
          <label htmlFor="sq" className="sr">بحث</label>
          <input id="sq" name="q" defaultValue={term} autoFocus placeholder="ابحثي عن منتج…" style={{ flex: 1, minWidth: 0, height: 40, border: "none", outline: "none", fontSize: 14, background: "transparent" }} />
        </form>
      </div>

      {!term && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h-section">الأكثر بحثاً</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {POPULAR.map((t) => <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="chip">{t}</Link>)}
          </div>
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p className="muted">{term ? (results.length ? `${results.length} نتائج` : "لا توجد نتائج، جرّبي كلمة أخرى") : "كل المنتجات"}</p>
        {results.map((p) => (
          <Link key={p.id} href={`/p/${p.slug}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: 10, borderRadius: 20, border: "1px solid var(--light-blush)", color: "var(--dark-plum)" }}>
            <span style={{ width: 64, height: 76, flexShrink: 0, borderRadius: 14, background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : placeholder(p.slug) }} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{p.name}</span>
              <span className="caption">{p.subtitle}</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: "var(--magenta)", flexShrink: 0 }}>{price(p.price)}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
