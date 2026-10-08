import Link from "next/link";
import { Icon } from "./Icon";
import { CartBadgeLink } from "./CartBadgeLink";
import { HeaderNav } from "./HeaderNav";
import { getCategories, getUnreadCount } from "@/lib/data";
import { getT } from "@/lib/i18n/server";

/** ترويسة الديسكتوب (تظهر من عرض 1024px فأكثر؛ على الجوال يبقى الشريط السفلي) */
export async function SiteHeader() {
  const t = await getT();
  const [cats, unread] = await Promise.all([getCategories(), getUnreadCount()]);
  return (
    <header className="site-header d-only">
      <div className="sh-row">
        <Link href="/" className="sh-logo" aria-label={t("شغلات بنات")}><img src="/icons/logo-horizontal.svg" alt={t("شغلات بنات")} /></Link>
        <form action="/search" className="search sh-search" role="search">
          <label htmlFor="hq" className="sr">{t("ابحثي عن منتج")}</label>
          <input id="hq" name="q" placeholder={t("ابحثي عن عباية، عطر، لانجري…")} />
          <button type="submit" className="go" aria-label={t("بحث")}><Icon name="search" stroke={2} /></button>
        </form>
        <nav className="sh-icons" aria-label={t("حسابي")}>
          <Link href="/notifications" className="icon-btn" aria-label={t("الإشعارات")}><Icon name="bell" />{unread > 0 && <span className="dot" />}</Link>
          <Link href="/favorites" className="icon-btn" aria-label={t("المفضلة")}><Icon name="heart" /></Link>
          <CartBadgeLink />
          <Link href="/account" className="icon-btn" aria-label={t("حسابي")}><Icon name="user" /></Link>
        </nav>
      </div>
      <HeaderNav items={[{ href: "/", label: t("الرئيسية") }, ...cats.map((c) => ({ href: `/c/${c.slug}`, label: c.name })), { href: "/search", label: t("كل المنتجات") }]} />
    </header>
  );
}

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="site-footer d-only">
      <div className="sf-row">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
          <img src="/icons/logo-horizontal.svg" alt={t("شغلات بنات")} style={{ height: 40, width: "auto", alignSelf: "flex-start" }} />
          <span className="muted">{t("كل ما تحتاجينه في مكان واحد")}</span>
        </div>
        <div className="sf-col">
          <b>{t("التسوّق")}</b>
          <Link href="/categories">{t("الأقسام")}</Link>
          <Link href="/search">{t("كل المنتجات")}</Link>
          <Link href="/favorites">{t("المفضلة")}</Link>
        </div>
        <div className="sf-col">
          <b>{t("حسابي")}</b>
          <Link href="/orders">{t("طلباتي")}</Link>
          <Link href="/account/addresses">{t("عناويني")}</Link>
          <Link href="/account">{t("الإعدادات")}</Link>
        </div>
        <div className="sf-col">
          <b>{t("المساعدة")}</b>
          <Link href="/about">{t("من نحن")}</Link>
          <Link href="/about?tab=contact">{t("تواصلي معنا")}</Link>
          <Link href="/about?tab=policies">{t("السياسات والخصوصية")}</Link>
        </div>
      </div>
      <div className="sf-copy caption">© {new Date().getFullYear()} {t("شغلات بنات")}</div>
    </footer>
  );
}
