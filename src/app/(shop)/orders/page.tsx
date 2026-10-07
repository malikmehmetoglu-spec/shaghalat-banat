import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/server";
import { date, ORDER_STATUS, price } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "طلباتي" };
const ACTIVE = ["new", "confirmed", "preparing", "shipped"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await getT();
  const { tab = "current" } = await searchParams;
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const { data } = await sb.from("orders").select("id,number,status,total,created_at,order_items(qty)").eq("user_id", u.user!.id).order("created_at", { ascending: false });
  const orders = (data ?? []).filter((o) => (tab === "past") !== ACTIVE.includes(o.status));

  return (
    <main className="page tight">
      <PageHeader title={t("طلباتي")} back="/account" />
      <div className="seg" role="tablist">
        <Link href="/orders" role="tab" aria-selected={tab !== "past"} className={tab !== "past" ? "on" : ""} style={tabStyle(tab !== "past")}>{t("الطلبات الحالية")}</Link>
        <Link href="/orders?tab=past" role="tab" aria-selected={tab === "past"} className={tab === "past" ? "on" : ""} style={tabStyle(tab === "past")}>{t("الطلبات السابقة")}</Link>
      </div>

      {orders.length === 0 && (
        <div className="empty">
          <span className="ring"><Icon name="bag" size={40} stroke={1.6} /></span>
          <div className="title-block"><span className="h-section">{t("لا توجد طلبات هنا")}</span><span className="muted">{t("طلباتك ستظهر في هذه الصفحة")}</span></div>
          <Link href="/" className="btn" style={{ height: 48, padding: "0 28px" }}>{t("تسوّقي الآن")}</Link>
        </div>
      )}

      {orders.map((o) => {
        const st = ORDER_STATUS[o.status];
        const pieces = (o.order_items as { qty: number }[]).reduce((s, i) => s + i.qty, 0);
        return (
          <div key={o.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="row-between">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="ltr" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, textAlign: "right" }}>#{o.number}</span>
                <span className="caption">{date(o.created_at, false, t)}</span>
              </div>
              <span className={`pill tone-${st.tone}`}>{t(st.label)}</span>
            </div>
            <hr className="divider" style={{ background: "var(--light-blush)" }} />
            <div className="row-between">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="caption">{pieces} {t("قطع")}</span>
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, color: "var(--magenta)" }}>{price(o.total, t)}</span>
              </div>
              <Link href={`/orders/${o.id}`} className={ACTIVE.includes(o.status) ? "btn" : "btn soft"}>{ACTIVE.includes(o.status) ? t("تتبّع الطلب") : t("التفاصيل")}</Link>
            </div>
          </div>
        );
      })}
    </main>
  );
}

function tabStyle(on: boolean): React.CSSProperties {
  return { flex: 1, height: 44, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1, fontWeight: on ? 600 : 500, color: on ? "var(--magenta)" : "var(--text-muted)", background: on ? "#fff" : "transparent", boxShadow: on ? "0 4px 12px rgba(214,3,127,.12)" : "none" };
}
