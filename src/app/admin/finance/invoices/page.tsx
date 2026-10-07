import Link from "next/link";
import { FINANCE_ROLES, requireStaff } from "@/lib/admin";
import { date, ORDER_STATUS, PAYMENT_LABEL, price } from "@/lib/format";
import { PrintButton } from "../PrintButton";

export const metadata = { title: "الفواتير" };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ tab?: string; id?: string }> }) {
  const { tab = "sales", id } = await searchParams;
  const { sb } = await requireStaff(FINANCE_ROLES);
  const { data: settings } = await sb.from("finance_settings").select("*").eq("id", 1).single();
  const rate = Number(settings?.tax_rate ?? 0);

  type Inv = { id: string; number: string; date: string; who: string; total: number; status: string; tone: string; lines: { name: string; qty: number; unit: number }[]; shipping: number; discount: number; payment?: string };
  let list: Inv[] = [];
  if (tab === "purchases") {
    const { data } = await sb.from("purchase_orders").select("id,number,created_at,status,supplier:suppliers(name),po_items(qty,unit_cost,variant:product_variants(sku,product:products(name)))").order("created_at", { ascending: false }).limit(100);
    list = (data ?? []).map((p: any) => ({
      id: p.id, number: p.number, date: p.created_at, who: p.supplier?.name ?? "", status: p.status === "received" ? "مستلمة" : p.status === "cancelled" ? "ملغاة" : "بانتظار الاستلام", tone: p.status === "received" ? "tone-success" : "tone-warning",
      lines: p.po_items.map((i: any) => ({ name: `${i.variant?.product?.name} (${i.variant?.sku})`, qty: i.qty, unit: Number(i.unit_cost) })), shipping: 0, discount: 0,
      total: p.po_items.reduce((s: number, i: any) => s + i.qty * Number(i.unit_cost), 0),
    }));
  } else {
    const { data } = await sb.from("orders").select("id,number,created_at,status,channel,payment_method,is_paid,total,shipping,discount,customer_phone,address_snapshot,profile:profiles!orders_user_id_fkey(full_name),order_items(product_name,variant_label,unit_price,qty)").neq("status", "cancelled").order("created_at", { ascending: false }).limit(100);
    list = (data ?? []).map((o: any) => ({
      id: o.id, number: o.number, date: o.created_at, who: (o.channel === "store" ? "المحل · " : "أونلاين · ") + (o.profile?.full_name || o.address_snapshot?.name || o.customer_phone || "عميلة"),
      status: o.status === "returned" ? "مرتجعة" : o.is_paid ? "مدفوعة" : ORDER_STATUS[o.status]?.label ?? o.status, tone: o.status === "returned" ? "tone-neutral" : o.is_paid ? "tone-success" : "tone-warning",
      lines: o.order_items.map((i: any) => ({ name: `${i.product_name}${i.variant_label ? ` · ${i.variant_label}` : ""}`, qty: i.qty, unit: Number(i.unit_price) })),
      shipping: Number(o.shipping), discount: Number(o.discount), total: Number(o.total), payment: PAYMENT_LABEL[o.payment_method],
    }));
  }
  const sel = list.find((x) => x.id === id) ?? list[0];
  const tax = sel ? (settings?.prices_include_tax ? sel.total - sel.total / (1 + rate / 100) : (sel.total * rate) / 100) : 0;
  const grand = sel ? (settings?.prices_include_tax ? sel.total : sel.total + tax) : 0;

  return (
    <>
      <div className="adm-top no-print"><div className="title-block"><h1 className="adm-h1">الفواتير</h1><span className="adm-sub">فواتير المبيعات تُصدر تلقائياً لكل طلب وعملية بيع، وفواتير المشتريات من أوامر الشراء</span></div></div>
      <div className="no-print" style={{ display: "flex", gap: 8 }}>
        <Link href="/admin/finance/invoices" className={`a-chip${tab !== "purchases" ? " on" : ""}`}>فواتير المبيعات</Link>
        <Link href="/admin/finance/invoices?tab=purchases" className={`a-chip${tab === "purchases" ? " on" : ""}`}>فواتير المشتريات</Link>
      </div>
      <div className="split">
        <div className="acard flush wide no-print">
          <div className="tw"><table className="tbl">
            <thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>{tab === "purchases" ? "المورد" : "العميلة"}</th><th>المبلغ</th><th>الحالة</th></tr></thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className={sel?.id === x.id ? "sel" : ""}>
                  <td><Link className="rowlink ltr" href={`/admin/finance/invoices?tab=${tab}&id=${x.id}`}>#{x.number}</Link></td>
                  <td className="caption">{date(x.date)}</td><td>{x.who}</td><td style={{ fontWeight: 600 }}>{price(x.total)}</td>
                  <td><span className={`pill ${x.tone}`}>{x.status}</span></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} className="caption" style={{ textAlign: "center", padding: 24 }}>لا فواتير بعد</td></tr>}
            </tbody>
          </table></div>
        </div>
        {sel && (
          <div className="narrow">
            <div className="acard invoice" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="row-between" style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <img src="/icons/logo-horizontal.svg" alt="شغلات بنات" style={{ height: 34, alignSelf: "flex-start" }} />
                  <span className="caption">{settings?.store_address || "[العنوان]"}{settings?.tax_number ? ` · الرقم الضريبي ${settings.tax_number}` : ""}</span>
                  {settings?.store_phone && <span className="caption ltr" style={{ textAlign: "right" }}>{settings.store_phone}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
                  <b className="ltr">#{sel.number}</b><span className="caption">{date(sel.date)}</span>
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{sel.who}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border-row)", paddingTop: 10 }}>
                <div className="kv caption"><span>البند</span><span>المبلغ</span></div>
                {sel.lines.map((l, i) => <div key={i} className="kv" style={{ fontSize: 13 }}><span>{l.name} × {l.qty}</span><span>{price(l.qty * l.unit)}</span></div>)}
                {sel.shipping > 0 && <div className="kv" style={{ fontSize: 13 }}><span>الشحن</span><span>{price(sel.shipping)}</span></div>}
                {sel.discount > 0 && <div className="kv" style={{ fontSize: 13 }}><span>الخصم</span><span>−{price(sel.discount)}</span></div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--border-row)", paddingTop: 10 }}>
                <div className="kv" style={{ fontSize: 13 }}><span className="adm-sub">المجموع قبل الضريبة</span><span>{price(grand - tax)}</span></div>
                <div className="kv" style={{ fontSize: 13 }}><span className="adm-sub">الضريبة ({rate}%)</span><span>{price(tax)}</span></div>
                <div className="kv" style={{ fontSize: 17 }}><b>الإجمالي</b><b style={{ color: "var(--magenta)" }}>{price(grand)}</b></div>
                {sel.payment && <span className="caption">طريقة الدفع: {sel.payment}</span>}
              </div>
              {settings?.invoice_footer && <span className="caption" style={{ textAlign: "center" }}>{settings.invoice_footer}</span>}
              <div className="no-print" style={{ display: "flex", gap: 8 }}>
                <PrintButton label="طباعة / PDF" />
                <a className="btn secondary" style={{ flex: 1 }} target="_blank" rel="noreferrer"
                  href={`https://wa.me/?text=${encodeURIComponent(`فاتورة شغلات بنات #${sel.number}\n${sel.lines.map((l) => `${l.name} × ${l.qty}`).join("\n")}\nالإجمالي: ${price(grand)}`)}`}>إرسال واتساب</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
