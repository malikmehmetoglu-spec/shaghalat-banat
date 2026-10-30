import { requireStaff } from "@/lib/admin";
import { moneySnapshot, monthBounds } from "@/lib/money";
import { ConsignView, type Trader } from "./ConsignView";

export const metadata = { title: "تجار الأمانة" };

export default async function ConsignPage() {
  const { sb } = await requireStaff("/admin/finance");
  const mb = monthBounds();
  const [{ data: cons }, { data: led }, { data: prods }, { data: sold }, snap, { data: fx }] = await Promise.all([
    sb.from("consignors").select("id,name,phone,mode,commission_pct,note,is_active").order("is_active", { ascending: false }).order("name"),
    sb.from("journal_lines").select("party_id,debit,credit").eq("account_code", "2300"),
    sb.from("products").select("id,name,consignor_id,product_variants(stock_levels(on_hand))").not("consignor_id", "is", null).is("archived_at", null),
    sb.from("order_items").select("consignor_id,product_name,variant_label,qty,unit_price,consignor_share,order:orders!inner(number,created_at,status)").not("consignor_id", "is", null).order("id", { ascending: false }).limit(500),
    moneySnapshot(sb),
    sb.from("fx_settings").select("usd_rate").eq("id", 1).maybeSingle(),
  ]);
  const traders: Trader[] = (cons ?? []).map((c: any) => {
    const due = (led ?? []).filter((l: any) => l.party_id === c.id).reduce((s: number, l: any) => s + Number(l.credit) - Number(l.debit), 0);
    const items = (prods ?? []).filter((p: any) => p.consignor_id === c.id);
    const stock = items.reduce((s: number, p: any) => s + (p.product_variants ?? []).reduce((a: number, v: any) => a + (v.stock_levels ?? []).reduce((b: number, x: any) => b + Number(x.on_hand), 0), 0), 0);
    const mine = (sold ?? []).filter((x: any) => x.consignor_id === c.id && !["cancelled", "returned"].includes(x.order.status));
    const month = mine.filter((x: any) => x.order.created_at.slice(0, 7) === mb.key);
    return {
      id: c.id, name: c.name, phone: c.phone, mode: c.mode, pct: Number(c.commission_pct), note: c.note, active: c.is_active,
      due, products: items.length, stock,
      monthSales: month.reduce((s: number, x: any) => s + x.qty * Number(x.unit_price), 0),
      monthShare: month.reduce((s: number, x: any) => s + Number(x.consignor_share ?? 0), 0),
      recent: mine.slice(0, 15).map((x: any) => ({ name: x.product_name + (x.variant_label ? ` · ${x.variant_label}` : ""), qty: x.qty, total: x.qty * Number(x.unit_price), share: Number(x.consignor_share ?? 0), number: x.order.number, at: x.order.created_at })),
    };
  });
  return <ConsignView traders={traders} sham={snap?.sham ?? 0} shop={snap?.shop ?? 0} rate={Number(fx?.usd_rate ?? 0)} />;
}
