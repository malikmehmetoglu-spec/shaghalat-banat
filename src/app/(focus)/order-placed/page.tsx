import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { price } from "@/lib/format";
import { intlPhone, orderNo, waLink } from "@/lib/orderMessages";

export const metadata = { title: "إتمام الدفع" };

/** بعد تأكيد الطلب: شام كاش (رمز QR + إرسال إشعار التحويل على واتساب) أو الدفع عبر خدمة العملاء */
export default async function OrderPlaced({ searchParams }: { searchParams: Promise<{ n?: string; t?: string; id?: string; pay?: string }> }) {
  const sp = await searchParams;
  const t = await getT();
  const sb = await createClient();
  let number = sp.n ?? "", total = Number(sp.t ?? 0), pay = sp.pay === "support" ? "support" : "shamcash";
  if (sp.id) {
    const { data: o } = await sb.from("orders").select("number,total,payment_method").eq("id", sp.id).maybeSingle();
    if (o) { number = o.number; total = Number(o.total); pay = o.payment_method === "support" ? "support" : "shamcash"; }
  }
  const { data: prof } = await sb.from("store_profile").select("whatsapp,shamcash_qr_url,shamcash_name").eq("id", 1).maybeSingle();
  const wa = intlPhone(prof?.whatsapp);
  const n = orderNo(number);
  const notice = `مرحباً، حوّلت مبلغ ${Math.round(total).toLocaleString("en-US")} ل.س عبر شام كاش لطلبي رقم ${n}. هذا إشعار التحويل:`;
  const askHelp = `مرحباً، أرسلت طلباً رقم ${n} بقيمة ${Math.round(total).toLocaleString("en-US")} ل.س وأريد الدفع عبر خدمة العملاء.`;

  return (
    <main className="page tight no-nav op">
      <div className="op-head">
        <span className="op-check" aria-hidden="true">✓</span>
        <h1 className="h-title">{t("تم استلام طلبك")}</h1>
        {number && <p className="muted">{t("رقم الطلب")} <b className="ltr op-num">{n}</b></p>}
      </div>

      {pay === "shamcash" ? (
        <section className="op-card">
          <span className="op-step">{t("الخطوة الأخيرة: الدفع عبر شام كاش")}</span>
          <div className="op-amount"><span>{t("المبلغ المطلوب")}</span><b>{price(total, t)}</b></div>
          {prof?.shamcash_qr_url ? (
            <div className="op-qr">
              <img src={prof.shamcash_qr_url} alt={t("رمز الدفع عبر شام كاش")} />
              {prof.shamcash_name && <span className="op-qr-name">{prof.shamcash_name}</span>}
            </div>
          ) : (
            <div className="alert tone-warning">{t("رمز الدفع غير متاح الآن، تواصلي معنا على واتساب وسنرسله لك.")}</div>
          )}
          {wa && <a className="op-wa ltr" href={waLink(wa, notice)} target="_blank" rel="noreferrer">+{wa}</a>}
          <ol className="op-steps">
            <li>{t("افتحي تطبيق شام كاش وامسحي الرمز")}</li>
            <li>{t("حوّلي المبلغ المطلوب كاملاً")}</li>
            <li>{t("أرسلي صورة إشعار التحويل على واتساب")}</li>
          </ol>
          {wa && <a className="btn cta block" href={waLink(wa, notice)} target="_blank" rel="noreferrer">{t("إرسال إشعار التحويل على واتساب")}</a>}
          <span className="caption op-note">{t("نؤكد طلبك ونبدأ تجهيزه فور وصول الإشعار.")}</span>
        </section>
      ) : (
        <section className="op-card">
          <span className="op-step">{t("الدفع عبر خدمة العملاء")}</span>
          <div className="op-amount"><span>{t("قيمة الطلب")}</span><b>{price(total, t)}</b></div>
          <p className="op-text">{t("ستتواصل معك مسؤولة خدمة العملاء قريباً على رقمك لترشدك لطريقة الدفع وتأكيد الطلب.")}</p>
          {wa && <a className="btn cta block" href={waLink(wa, askHelp)} target="_blank" rel="noreferrer">{t("تواصلي معنا الآن على واتساب")}</a>}
        </section>
      )}

      <Link href="/" className="btn secondary block">{t("متابعة التسوّق")}</Link>
    </main>
  );
}
