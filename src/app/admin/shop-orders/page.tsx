import { requireStaff } from "@/lib/admin";
import { rolesFor } from "@/lib/access";
import { intlPhone } from "@/lib/orderMessages";
import { Board, type BoardOrder } from "./Board";

export const metadata = { title: "طلبات المتجر" };
export const dynamic = "force-dynamic";

export default async function ShopOrders() {
  const { sb, profile } = await requireStaff(rolesFor("/admin/shop-orders"));
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const cols = "id,number,status,payment_method,is_paid,total,subtotal,shipping,discount,created_at,customer_phone,address_snapshot,note,user:profiles!orders_user_id_fkey(full_name,phone),order_items(product_name,variant_label,qty,unit_price)";
  const [{ data: open }, { data: done }] = await Promise.all([
    sb.from("orders").select(cols).eq("channel", "online").in("status", ["new", "confirmed", "preparing", "shipped"]).order("created_at", { ascending: true }).limit(300),
    sb.from("orders").select(cols).eq("channel", "online").eq("status", "delivered").gte("created_at", since).order("created_at", { ascending: false }).limit(100),
  ]);
  const orders: BoardOrder[] = [...(open ?? []), ...(done ?? [])].map((o: any) => {
    const a = o.address_snapshot ?? {};
    return {
      id: o.id, number: o.number, status: o.status === "confirmed" ? "new" : o.status, payment: o.payment_method, paid: o.is_paid,
      total: Number(o.total), shipping: Number(o.shipping), discount: Number(o.discount), createdAt: o.created_at, note: o.note,
      name: o.user?.full_name || a.name || "عميلة", city: a.city ?? "", street: a.street ?? "",
      phone: intlPhone(a.recipient_phone || o.customer_phone || a.phone || o.user?.phone),
      items: (o.order_items ?? []).map((i: any) => ({ name: i.product_name, label: i.variant_label, qty: i.qty, price: Number(i.unit_price) })),
    };
  });
  return <Board orders={orders} agent={profile.full_name ?? ""} />;
}
