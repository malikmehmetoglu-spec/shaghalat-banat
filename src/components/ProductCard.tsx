"use client";
import Link from "next/link";
import { placeholder, price } from "@/lib/format";
import type { Product } from "@/lib/types";
import { FavButton } from "./FavButton";
import { useT } from "@/components/LangProvider";

/** بطاقة المنتج: الصورة بإطار عمودي، والمعلومات تحتها على الأبيض */
export function ProductCard({ p, isFav = false }: { p: Product; isFav?: boolean; height?: number }) {
  const t = useT();
  const img = p.images?.[0];
  const off = p.compare_at_price && Number(p.compare_at_price) > Number(p.price);
  return (
    <div className="pc">
      <div className="pc-img" style={{ background: img ? `url(${img}) center/cover` : placeholder(p.slug) }}>
        {!img && <span className="ph">{t("[صورة المنتج]")}</span>}
        {p.tag && <span className="tag">{p.tag}</span>}
        <FavButton productId={p.id} initial={isFav} />
      </div>
      <div className="pc-info">
        <span className="pc-name">{p.name}</span>
        {p.subtitle && <span className="pc-sub">{p.subtitle}</span>}
        <span className="pc-price">
          <b>{price(p.price, t)}</b>
          {off && <s>{price(p.compare_at_price, t)}</s>}
        </span>
      </div>
      <Link href={`/p/${p.slug}`} className="pc-link" aria-label={p.name} />
    </div>
  );
}
