import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { price } from "@/lib/format";

export const metadata = { title: "تم استلام طلبك" };

export default async function OrderPlaced({ searchParams }: { searchParams: Promise<{ n?: string; t?: string }> }) {
  const { n = "", t: total } = await searchParams;
  const t = await getT();
  const sb = await createClient();
  const { data: sp } = await sb.from("store_profile").select("whatsapp").eq("id", 1).maybeSingle();
  const wa = (sp?.whatsapp || "").replace(/\D/g, "");
  return (
    <main className="page tight no-nav" style={{ alignItems: "center", textAlign: "center", paddingTop: 48 }}>
      <span style={{ width: 96, height: 96, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--grad-cta, var(--magenta))", color: "#fff", fontSize: 44, boxShadow: "0 16px 36px rgba(214,3,127,.35)" }}>✓</span>
      <h1 className="h-title" style={{ fontSize: 24 }}>{t("تم استلام طلبك!")}</h1>
      {n && <p className="muted" style={{ lineHeight: 1.8 }}>{t("رقم الطلب")} <b className="ltr" style={{ color: "var(--magenta)" }}>#{n}</b>{total ? <> · {price(Number(total), t)}</> : null}</p>}
      <p className="muted" style={{ lineHeight: 1.8, maxWidth: 340 }}>{t("سنتواصل معك قريباً على رقمك لتأكيد الطلب وموعد التوصيل.")}</p>
      {wa && n && <a className="btn cta block" style={{ maxWidth: 340 }} href={`https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً، أرسلت طلباً من المتجر رقم #${n}`)}`} target="_blank" rel="noreferrer">{t("تواصلي معنا على واتساب")}</a>}
      <Link href="/" className="btn secondary block" style={{ maxWidth: 340 }}>{t("متابعة التسوّق")}</Link>
    </main>
  );
}
