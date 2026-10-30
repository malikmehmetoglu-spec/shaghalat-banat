import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getFx, getLocations, requireStaff } from "@/lib/admin";
import { FxCard } from "../FxCard";
import { placeholder, price } from "@/lib/format";
import { OnlineToggle } from "./OnlineToggle";
import { QtyButton } from "./QtyButton";
import { DeleteProduct } from "./DeleteProduct";

export const metadata = { title: "المنتجات" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string; saved?: string; nocost?: string }> }) {
  const { cat = "", q = "", saved, nocost } = await searchParams;
  const { sb, profile } = await requireStaff();
  const isOwner = profile.role === "owner";
  const [locations, { data: cats }] = await Promise.all([getLocations(), sb.from("categories").select("id,name").order("sort_order")]);
  let query = sb.from("products")
    .select("id,slug,name,price,images,is_online,product_categories(categories(name)),product_variants(id,sku,barcode,size,color_name,color_hex,stock_levels(location_id,on_hand,reserved))")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (cat) { const { data: ids } = await sb.from("product_categories").select("product_id").eq("category_id", cat); query = query.in("id", (ids ?? []).map((r) => r.product_id).concat("00000000-0000-0000-0000-000000000000")); }
  if (q) query = query.ilike("name", `%${q.replace(/[%,]/g, "")}%`);
  if (nocost) query = query.is("consignor_id", null).or("cost.is.null,cost.eq.0");
  const { data: products } = await query;
  const wh = locations.find((l) => l.kind === "warehouse")?.id;
  const st = locations.find((l) => l.kind === "store")?.id;

  const qty = (p: any, loc?: string) => p.product_variants.reduce((s: number, v: any) => s + v.stock_levels.filter((x: any) => x.location_id === loc).reduce((a: number, x: any) => a + x.on_hand, 0), 0);
  const cls = (n: number) => `qtyp${n === 0 ? " out" : n < 5 ? " low" : ""}`;

  const fx = await getFx();
  return (
    <>
      <div className="adm-top">
        <div className="title-block">
          <h1 className="adm-h1">المنتجات</h1>
          <span className="adm-sub">{nocost ? <>{products?.length ?? 0} منتجاً بلا سعر تكلفة · افتحي كل منتج وأدخلي التكلفة ليصبح الربح دقيقاً · <Link href="/admin/products" style={{ color: "var(--magenta)" }}>عرض الكل</Link></> : <>{products?.length ?? 0} منتجاً · المخزون موزّع بين المستودع والمحل</>}</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <form action="/admin/products" style={{ display: "flex", gap: 8 }}>
            {cat && <input type="hidden" name="cat" value={cat} />}
            <label htmlFor="pq" className="sr">بحث</label>
            <input id="pq" name="q" defaultValue={q} className="a-in" placeholder="اسم المنتج" style={{ width: 220 }} />
          </form>
          <Link href="/admin/products/new" className="btn">+ إضافة منتج</Link>
        </div>
      </div>
      {saved && (() => { const sp = (products ?? []).find((x: any) => x.id === saved); return sp ? (
        <div className="a-flash tone-success" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span>✓ تم حفظ «{sp.name}» بكل ألوانه ومقاساته وكمياته، وتولّد باركود لكل قطعة.</span>
          <span style={{ display: "flex", gap: 8 }}>
            <Link href={`/admin/barcodes/print?product=${sp.id}`} className="btn" style={{ minHeight: 40 }}>اطبع الملصقات</Link>
            <Link href="/admin/products/new" className="btn soft" style={{ minHeight: 40 }}>+ منتج آخر</Link>
          </span>
        </div>) : null; })()}
      <details className="fx-mini">
        <summary>💵 سعر الدولار: <b className="ltr">{fx.rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}</b> ل.س {fx.auto ? "· تلقائي" : "· يدوي"}</summary>
        <div style={{ marginTop: 10, maxWidth: 520 }}><FxCard {...fx} canEdit={["owner", "accountant"].includes(profile.role)} /></div>
      </details>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/admin/products" className={`a-chip${!cat ? " on" : ""}`}>الكل</Link>
        {(cats ?? []).map((c) => <Link key={c.id} href={`/admin/products?cat=${c.id}`} className={`a-chip${cat === c.id ? " on" : ""}`}>{c.name}</Link>)}
      </div>

      <div className="acard flush">
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>المنتج</th><th>القسم</th><th>السعر</th><th>المتغيرات</th><th>المستودع</th><th>المحل</th><th>ظاهر أونلاين</th><th></th></tr></thead>
            <tbody>
              {(products ?? []).map((p: any) => {
                const w = qty(p, wh), s = qty(p, st);
                return (
                  <tr key={p.id}>
                    <td><span style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="thumb" style={{ background: p.images?.[0] ? `url(${p.images[0]}) center/cover` : placeholder(p.slug) }} /><Link href={`/admin/products/${p.id}`} className="rowlink">{p.name}</Link></span></td>
                    <td className="caption">{(p.product_categories ?? []).map((r: any) => r.categories?.name).filter(Boolean).join("، ") || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{price(p.price)}</td>
                    <td className="caption">{p.product_variants.length}</td>
                    <td><span className={cls(w)}>{w}</span></td>
                    <td><span className={cls(s)}>{s}</span></td>
                    <td><OnlineToggle id={p.id} value={p.is_online} /></td>
                    <td><span style={{ display: "flex", gap: 6 }}><QtyButton productId={p.id} name={p.name} variants={p.product_variants} locations={locations.filter((l) => l.kind !== "transit").map((l) => ({ id: l.id, name: l.name }))} /><Link href={`/admin/products/${p.id}`} className="btn soft" style={{ gap: 6 }}><Icon name="edit" size={15} stroke={2} />تعديل</Link><Link href={`/admin/barcodes/print?product=${p.id}`} className="btn soft" style={{ gap: 6 }} title="طباعة ملصقات الباركود"><Icon name="barcode" size={15} stroke={2} />طباعة باركود</Link>{isOwner && <DeleteProduct id={p.id} name={p.name} />}</span></td>
                  </tr>
                );
              })}
              {!products?.length && <tr><td colSpan={8} className="caption" style={{ textAlign: "center", padding: 24 }}>لا توجد منتجات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
