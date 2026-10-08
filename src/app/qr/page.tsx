import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import "./qr.css";

export const metadata: Metadata = {
  title: "شغلات بنات — تواصلي معنا",
  description: "واتساب، فيسبوك، إنستغرام، والمتجر الإلكتروني — كل روابط شغلات بنات في مكان واحد.",
};
export const revalidate = 300;

const WA = <path d="M12 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4.1 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.5-.3Z" fill="currentColor" />;
const FB = <path d="M14 8h3V4h-3c-2.8 0-4.5 1.9-4.5 4.7V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1Z" fill="currentColor" />;
const IG = (<><rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" /></>);
const BAG = (<><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>);

export default async function QrPage() {
  const sb = await createClient();
  const { data: p } = await sb.from("store_profile").select("whatsapp,facebook_url,instagram_url,tagline").eq("id", 1).maybeSingle();
  const wa = (p?.whatsapp ?? "").replace(/\D/g, "");
  const links = [
    { key: "wa", label: "تواصلي معنا عبر واتساب", sub: "نردّ عليكِ بأسرع وقت", href: wa ? `https://wa.me/${wa}` : null, icon: WA },
    { key: "ig", label: "صفحتنا على إنستغرام", sub: "أحدث القطع والعروض أولاً بأول", href: p?.instagram_url || null, icon: IG },
    { key: "fb", label: "صفحتنا على فيسبوك", sub: "تابعينا وشاركينا رأيك", href: p?.facebook_url || null, icon: FB },
    { key: "shop", label: "تسوّقي من المتجر الإلكتروني", sub: "اطلبي أونلاين والدفع عند الاستلام", href: "/", icon: BAG },
  ];

  return (
    <main className="qr">
      <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="qr-mark" />
      <header className="qr-head">
        <span className="qr-arch"><img src="/icons/logo-stacked.svg" alt="شغلات بنات" /></span>
        <p className="qr-tag">{p?.tagline || "كل ما تحبّه البنات في مكان واحد"}</p>
      </header>

      <nav className="qr-links" aria-label="روابط شغلات بنات">
        {links.map((l, i) => {
          const inner = (
            <>
              <span className={`qr-ic qr-ic-${l.key}`}><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">{l.icon}</svg></span>
              <span className="qr-txt"><b>{l.label}</b><small>{l.href ? l.sub : "قريباً"}</small></span>
              <svg className="qr-go" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </>
          );
          return l.href
            ? <a key={l.key} href={l.href} className={`qr-btn${l.key === "shop" ? " primary" : ""}`} style={{ animationDelay: `${120 + i * 90}ms` }} {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inner}</a>
            : <span key={l.key} className="qr-btn disabled" aria-disabled="true" style={{ animationDelay: `${120 + i * 90}ms` }}>{inner}</span>;
        })}
      </nav>

      <footer className="qr-foot">
        <span>تغليف محايد · توصيل لباب البيت · استبدال خلال 7 أيام</span>
        <span className="ltr">shaghalat-banat.com</span>
      </footer>
    </main>
  );
}
