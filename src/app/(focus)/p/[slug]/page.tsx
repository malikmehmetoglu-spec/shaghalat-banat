import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFavoriteIds, getProduct } from "@/lib/data";
import { ProductView } from "./ProductView";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return { title: p?.name ?? "منتج", description: p?.description ?? undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, favs] = await Promise.all([getProduct(slug), getFavoriteIds()]);
  if (!p) notFound();
  return <ProductView p={p} isFav={favs.has(p.id)} />;
}
