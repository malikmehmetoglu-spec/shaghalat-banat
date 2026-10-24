"use client";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { useT } from "@/components/LangProvider";

/** وصل حديثاً مع فلاتر سريعة حسب القسم — بدون مغادرة الصفحة */
export function NewArrivals({ products, cats, favIds }: { products: Product[]; cats: { id: string; name: string }[]; favIds: string[] }) {
  const t = useT();
  const [cat, setCat] = useState<string | null>(null);
  const favs = useMemo(() => new Set(favIds), [favIds]);
  const usable = useMemo(() => cats.filter((c) => products.some((p) => p.category_id === c.id)), [cats, products]);
  const shown = (cat ? products.filter((p) => p.category_id === cat) : products).slice(0, 8);
  return (
    <>
      {usable.length > 1 && (
        <div className="chips scr" role="tablist" aria-label={t("تصفية حسب القسم")}>
          <button type="button" role="tab" aria-selected={!cat} className={`chip${!cat ? " on" : ""}`} onClick={() => setCat(null)}>{t("الكل")}</button>
          {usable.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={`chip${cat === c.id ? " on" : ""}`} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>
      )}
      <div className="grid-2">
        {shown.map((p) => <ProductCard key={p.id} p={p} isFav={favs.has(p.id)} />)}
      </div>
    </>
  );
}
