import { decodeSlug } from "@/lib/format";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { findRenamedProduct, getFavoriteIds, getProduct } from "@/lib/data";
import { ProductView } from "./ProductView";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProduct(decodeSlug((await params).slug));
  return { title: p?.name ?? "منتج", description: p?.description ?? undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getT();
  const slug = decodeSlug((await params).slug);
  const [p, favs] = await Promise.all([getProduct(slug), getFavoriteIds()]);
  if (!p) { const to = await findRenamedProduct(slug); if (to) permanentRedirect(`/p/${to}`); notFound(); }
  return <ProductView p={p} isFav={favs.has(p.id)} />;
}
