"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Pic } from "@/components/Pic";
import { placeholder, price } from "@/lib/format";
import { useT } from "@/components/LangProvider";

export type Recent = { slug: string; name: string; price: number; img: string | null };
const KEY = "sb-recent";

export function readRecent(): Recent[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
/** يُستدعى من صفحة المنتج: آخر 12 منتجاً، الأحدث أولاً */
export function pushRecent(r: Recent) {
  try { localStorage.setItem(KEY, JSON.stringify([r, ...readRecent().filter((x) => x.slug !== r.slug)].slice(0, 12))); } catch {}
}

/** شاهدتِ مؤخراً — يظهر فقط للزائرة التي فتحت منتجات من قبل */
export function RecentlyViewed() {
  const t = useT();
  const [items, setItems] = useState<Recent[]>([]);
  useEffect(() => setItems(readRecent()), []);
  if (!items.length) return null;
  return (
    <section className="sec">
      <h2 className="sec-title">{t("شاهدتِ مؤخراً")}</h2>
      <div className="rv-row scr">
        {items.map((r) => (
          <Link key={r.slug} href={`/p/${r.slug}`} className="rv-card">
            <span className="rv-img" style={{ background: placeholder(r.slug) }}>{r.img && <Pic src={r.img} alt="" />}</span>
            <span className="rv-name">{r.name}</span>
            <b className="rv-price">{price(r.price, t)}</b>
          </Link>
        ))}
      </div>
    </section>
  );
}
