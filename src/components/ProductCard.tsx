import Link from "next/link";
import { placeholder, price } from "@/lib/format";
import type { Product } from "@/lib/types";
import { FavButton } from "./FavButton";

export function ProductCard({ p, isFav = false, height = 230 }: { p: Product; isFav?: boolean; height?: number }) {
  const img = p.images?.[0];
  return (
    <div className="pcard" style={{ height, background: img ? `url(${img}) center/cover` : placeholder(p.slug) }}>
      <Link href={`/p/${p.slug}`} className="link" aria-label={p.name} />
      {!img && <span className="ph">[صورة المنتج]</span>}
      {p.tag && <span className="tag">{p.tag}</span>}
      <FavButton productId={p.id} initial={isFav} />
      <div className="glass">
        <span className="n">{p.name}</span>
        <span className="m"><span>{p.subtitle}</span><span className="ltr">★ {Number(p.rating).toFixed(1)}</span></span>
        <span className="p">{price(p.price)}</span>
      </div>
    </div>
  );
}
