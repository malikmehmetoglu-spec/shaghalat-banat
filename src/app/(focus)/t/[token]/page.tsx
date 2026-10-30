import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { date, ORDER_STATUS, PAYMENT_LABEL, price } from "@/lib/format";
import { AccountSignup } from "@/components/AccountSignup";

export const metadata = { title: "تتبّع الطلب", robots: { index: false } };
export const dynamic = "force-dynamic";

const FLOW = [
  { key: "new", label: "تم استلام الطلب" },
  { key: "preparing", label: "قيد التجهيز" },
  { key: "shipped", label: "قيد الشحن" },
  { key: "delivered", label: "تم التوصيل" },
];
type T = { id: string; number: string; status: string; total: number; subtotal: number; shipping: number; discount: number; payment: string; created_at: string; city: string | null; name: string; has_account: boolean;
  items: { name: string; label: string | null; qty: number; price: number }[]; events: { status: string; at: string }[] };

/** تتبّع الطلب برابط خاص (بدون تسجيل دخول) — يُرسل للزبونة عبر واتساب */
export default async function Track({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{24}$/.test(token)) notFound();
  const t = await getT();
  const sb = await createClient();
  const [{ data }, { data: auth }, { data: prof }] = await Promise.all([
    sb.rpc("track_order", { p_token: token }),
    sb.auth.getUser(),
    sb.from("store_profile").select("welcome_percent").eq("id", 1).maybeSingle(),
  ]);
  const o = data as T | null;
  if (!o) notFound();
  const st = o.status === "confirmed" ? "new" : o.status;
  const idx = FLOW.findIndex((f) => f.key === st);
  const at = new Map(o.events.map((e) => [e.status === "confirmed" ? "new" : e.status, e.at]));
  const cancelled = o.status === "cancelled" || o.status === "returned";

  return (
    <main className="page tight no-nav op">
      <div className="op-head">
        <img src="/icons/logo-mark.svg" alt="" style={{ height: 48 }} />
        <h1 className="h-title">{o.name ? t("طلبك يا {n}", { n: o.name }) : t("تتبّع الطلب")}</h1>
        <p className="muted">{t("رقم الطلب")} <b className="ltr op-num">{o.number.replace(/\D/g, "")}</b> · {date(o.created_at)}</p>
      </div>

      <section className="op-card">
        {cancelled ? <div className="alert tone-danger">{t(ORDER_STATUS[o.status]?.label ?? o.status)}</div> : (
          <ol className="tr-flow">
            {FLOW.map((f, i) => (
              <li key={f.key} className={i < idx ? "done" : i === idx ? "now" : ""}>
                <span className="tr-dot" aria-hidden="true">{i < idx ? "✓" : i + 1}</span>
                <span className="tr-t"><b>{t(f.label)}</b>{at.get(f.key) && <span>{date(at.get(f.key)!, true)}</span>}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="op-card">
        {o.items.map((it, k) => (
          <div key={k} className="tr-item"><span>{it.name}{it.label ? ` · ${it.label}` : ""} <b className="ltr">×{it.qty}</b></span><span>{price(it.price * it.qty, t)}</span></div>
        ))}
        <div className="tr-item muted"><span>{t("الشحن")}</span><span>{o.shipping ? price(o.shipping, t) : t("مجاني")}</span></div>
        {o.discount > 0 && <div className="tr-item muted"><span>{t("الخصم")}</span><span>−{price(o.discount, t)}</span></div>}
        <div className="tr-item tr-total"><span>{t("الإجمالي")}</span><b>{price(o.total, t)}</b></div>
        <span className="caption">{t(PAYMENT_LABEL[o.payment] ?? o.payment)}{o.city ? ` · ${o.city}` : ""}</span>
      </section>

      {!auth.user && <AccountSignup percent={o.has_account ? 0 : prof?.welcome_percent ?? 0} />}
      {auth.user && <Link href="/orders" className="btn secondary block">{t("طلباتي")}</Link>}
      <Link href="/" className="btn secondary block">{t("متابعة التسوّق")}</Link>
    </main>
  );
}
