import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";
import { getFavoriteIds, getProducts } from "@/lib/data";

import { getT } from "@/lib/i18n/server";

export const metadata = { title: "البحث" };

const POPULAR = ["عبايات", "لانجري", "عطر", "بيجاما", "روب", "ساتان"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; min?: string; max?: string; sale?: string; sort?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const term = (sp.q ?? "").trim();
  const n = (v?: string) => (v && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);
  const minPrice = n(sp.min), maxPrice = n(sp.max), onSale = sp.sale === "1", best = sp.sort === "best";
  const filtered = minPrice != null || maxPrice != null || onSale || best;
  const [results, favs] = await Promise.all([
    getProducts({ q: term || undefined, sort: best ? "best" : "new", minPrice, maxPrice, onSale }),
    getFavoriteIds(),
  ]);
  const fmt = (v: number) => v.toLocaleString("en-US");
  const title = term
    ? (results.length ? t("{n} نتائج", { n: results.length }) : t("لا توجد نتائج، جرّبي كلمة أخرى"))
    : onSale ? t("كل العروض")
    : maxPrice != null ? t("أقل من {n} ل.س", { n: fmt(maxPrice) })
    : minPrice != null ? t("من {n} ل.س فأكثر", { n: fmt(minPrice) })
    : best ? t("الأكثر مبيعاً") : t("كل المنتجات");

  return (
    <main className="page wide" style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" className="icon-btn m-only" aria-label={t("رجوع")}><Icon name="back" stroke={2} /></Link>
        <form action="/search" role="search" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, height: 52, paddingInlineStart: 18, paddingInlineEnd: 6, borderRadius: 26, border: "1.5px solid var(--magenta)" }}>
          <span style={{ color: "var(--magenta)", display: "flex" }}><Icon name="search" size={18} stroke={2} /></span>
          <label htmlFor="sq" className="sr">{t("بحث")}</label>
          {minPrice != null && <input type="hidden" name="min" value={minPrice} />}
          {maxPrice != null && <input type="hidden" name="max" value={maxPrice} />}
          {onSale && <input type="hidden" name="sale" value="1" />}
          <input id="sq" name="q" defaultValue={term} autoFocus placeholder={t("ابحثي عن منتج…")} style={{ flex: 1, minWidth: 0, height: 40, border: "none", outline: "none", fontSize: 14, background: "transparent" }} />
        </form>
      </div>

      {!term && !filtered && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="h-section">{t("الأكثر بحثاً")}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {POPULAR.map((w) => <Link key={w} href={`/search?q=${encodeURIComponent(t(w))}`} className="chip">{t(w)}</Link>)}
          </div>
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h1 className="sec-title" style={{ margin: 0 }}>{title}</h1>
        <div className="grid-2">
          {results.map((p) => <ProductCard key={p.id} p={p} isFav={favs.has(p.id)} />)}
        </div>
      </section>
    </main>
  );
}
