import Link from "next/link";
import { getLocations, requireStaff } from "@/lib/admin";
import { placeholder, price } from "@/lib/format";
import { OnlineToggle } from "./OnlineToggle";

export const metadata = { title: "المنتجات" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const { cat = "", q = "" } = await searchParams;
  const { sb } = await requireStaff();
  const [locations, { data: cats }] = await Promise.all([getLocations(), sb.from("categories").select("id,name").order("sort_order")]);
  let query = sb.from("products")
    .select("id,slug,name,price,images,is_online,category:categories(name),product_variants(sku,stock_levels(location_id,on_hand,reserved))")
    .order("created_at", { ascending: false });
  if (cat) query = query.eq("category_id", cat);
  if (q) query = query.ilike("name", `%${q.replace(/[%,]/g, "")}%`);
  const { data: products } = await query;
  const wh = locations.find((l) => l.kind === "warehouse")?.id;
  const st = locations.find((l) => l.kind === "store")?.id;

  const qty = (p: any, loc?: string) => p.product_variants.reduce((s: number, v: any) => s + v.stock_levels.filter((x: any) => x.location_id === loc).reduce((a: number, x: any) => a + x.on_hand, 0), 0);
  const cls = (n: number) => `qtyp${n === 0 ? " out" : n < 5 ? " low" : ""}`;

  return (
    <>
      <div className="adm-top">
        <div className="title-block">
          <h1 className="adm-h1">المنتجات</h1>
          <span className="adm-sub">{products?.length ?? 0} منتجاً · المخزون موزّع بين المستودع والمحل</span>
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
                    <td className="caption">{p.category?.name ?? "—"}</td>
                    <td style={{ fontWeight: 600 }}>{price(p.price)}</td>
                    <td className="caption">{p.product_variants.length}</td>
                    <td><span className={cls(w)}>{w}</span></td>
                    <td><span className={cls(s)}>{s}</span></td>
                    <td><OnlineToggle id={p.id} value={p.is_online} /></td>
                    <td><Link href={`/admin/products/${p.id}`} className="btn soft">تعديل</Link></td>
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
