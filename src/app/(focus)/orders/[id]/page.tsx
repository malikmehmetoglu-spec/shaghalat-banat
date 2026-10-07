import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/server";
import { date, ORDER_STATUS, PAYMENT_LABEL, price } from "@/lib/format";

export const metadata = { title: "تتبّع الطلب" };

const FLOW = [
  { key: "new", label: "تم استلام الطلب" },
  { key: "confirmed", label: "تم تأكيد الطلب" },
  { key: "preparing", label: "قيد التجهيز" },
  { key: "shipped", label: "قيد الشحن" },
  { key: "delivered", label: "تم التوصيل" },
];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { id } = await params;
  const { placed } = await searchParams;
  const sb = await createClient();
  const { data: o } = await sb.from("orders")
    .select("id,number,status,total,subtotal,shipping,discount,payment_method,created_at,address_snapshot,order_items(product_name,variant_label,unit_price,qty),order_events(status,created_at)")
    .eq("id", id).maybeSingle();
  if (!o) notFound();

  const st = ORDER_STATUS[o.status];
  const reachedIdx = FLOW.findIndex((f) => f.key === o.status);
  const eventAt = new Map((o.order_events as { status: string; created_at: string }[]).map((e) => [e.status, e.created_at]));
  const addr = o.address_snapshot as { label?: string; city?: string; street?: string } | null;

  return (
    <main className="page tight" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <Link href="/orders" className="icon-btn" aria-label="رجوع"><Icon name="back" stroke={2} /></Link>
        <h1 className="h-title">{placed ? "تم استلام طلبك" : "تتبّع الطلب"}</h1>
        <span style={{ width: 48 }} />
      </div>

      {placed && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", padding: "8px 0" }}>
          <span style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--magenta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 28px rgba(214,3,127,.35)" }}>
            <Icon name="check" size={36} stroke={2.6} />
          </span>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.8 }}>شكراً لتسوّقك من شغلات بنات.<br />سنرسل لك إشعاراً عند كل تحديث على طلبك.</p>
        </div>
      )}

      <div style={{ padding: 24, borderRadius: 28, background: "linear-gradient(135deg,var(--deep-berry),var(--magenta))", color: "#fff", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="row-between">
          <span className="ltr" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>#{o.number}</span>
          <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1, padding: "8px 12px", borderRadius: 14, background: "rgba(255,255,255,.2)" }}>{st.label}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>تاريخ الطلب</span>
          <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5 }}>{date(o.created_at)}</span>
        </div>
      </div>

      {reachedIdx >= 0 && (
        <div className="timeline">
          {FLOW.map((f, i) => {
            const done = i <= reachedIdx;
            const at = eventAt.get(f.key);
            return (
              <div key={f.key} className="tl-row">
                <div className="tl-rail">
                  <span className={`tl-dot${done ? " done" : ""}`} style={i === reachedIdx ? { boxShadow: "0 0 0 6px rgba(214,3,127,.15)" } : undefined}>
                    {done && <Icon name="check" size={14} stroke={3} />}
                  </span>
                  {i < FLOW.length - 1 && <span className={`tl-line${i < reachedIdx ? " done" : ""}`} />}
                </div>
                <div className="tl-body">
                  <span style={{ fontSize: 15, lineHeight: 1.5, fontWeight: i === reachedIdx ? 700 : done ? 600 : 400, color: i === reachedIdx ? "var(--magenta)" : done ? "var(--dark-plum)" : "var(--text-muted)" }}>{f.label}</span>
                  <span className="caption">{at ? date(at, true) : "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="soft-card">
        <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>تفاصيل الطلب</span>
        {(o.order_items as { product_name: string; variant_label: string | null; unit_price: number; qty: number }[]).map((it, i) => (
          <div key={i} className="kv"><span>{it.product_name}{it.variant_label ? ` · ${it.variant_label}` : ""} × {it.qty}</span><span>{price(it.unit_price * it.qty)}</span></div>
        ))}
        <hr className="divider" />
        <div className="kv"><span className="muted">الشحن</span><span>{Number(o.shipping) ? price(o.shipping) : "مجاني"}</span></div>
        {Number(o.discount) > 0 && <div className="kv" style={{ color: "var(--magenta)" }}><span>الخصم</span><span>- {price(o.discount)}</span></div>}
        <div className="kv" style={{ fontSize: 16, fontWeight: 700 }}><span>الإجمالي</span><span style={{ color: "var(--magenta)" }}>{price(o.total)}</span></div>
        <div className="kv"><span className="muted">الدفع</span><span>{PAYMENT_LABEL[o.payment_method]}</span></div>
        {addr && <div className="kv"><span className="muted">التوصيل إلى</span><span style={{ textAlign: "left" }}>{addr.city}، {addr.street}</span></div>}
      </div>

      <Link href="/" className="btn secondary block" style={{ height: 56 }}>متابعة التسوّق</Link>
    </main>
  );
}
