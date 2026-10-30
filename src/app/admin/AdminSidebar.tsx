"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { AdminLogout } from "./AdminLogout";
import { canAccess } from "@/lib/access";
import { INV_TABS, invTabActive, invTabsFor, isInvPath } from "@/lib/inventoryNav";
import { FIN_TABS, finTabActive, isFinPath } from "@/lib/financeNav";
import { ORD_TABS, isOrdPath } from "@/lib/ordersNav";
import { MKT_TABS, isMktPath } from "@/lib/marketingNav";

type Item = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; exact?: boolean; group?: "inventory" | "finance" | "orders" | "marketing" };
/** القائمة: عناصر مسطّحة بلا تصنيفات، بترتيب يوم العمل */
const ITEMS: Item[] = [
  { href: "/admin", label: "لوحة المؤشرات", icon: "grid", exact: true },
  { href: "/admin/shop-orders", label: "طلبات المتجر", icon: "truck", group: "orders" },
  { href: "/admin/pos", label: "نقطة البيع", icon: "cart" },
  { href: "/admin/products", label: "المنتجات", icon: "tag" },
  { href: "/admin/inventory", label: "إدارة المخزون", icon: "boxes", group: "inventory" },
  { href: "/admin/customers", label: "إدارة التسويق", icon: "bell", group: "marketing" },
  { href: "/admin/finance", label: "الإدارة المالية", icon: "card", group: "finance" },
  { href: "/admin/settings", label: "إعدادات المتجر", icon: "edit" },
  { href: "/admin/staff", label: "الموظفون والأدوار", icon: "shield" },
];

export function AdminSidebar({ name, role, roleKey, extra = [] }: { name: string; role: string; roleKey: string; extra?: string[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [fold, setFold] = useState(false);
  useEffect(() => { try { setFold(localStorage.getItem("adm-fold") === "1"); } catch {} }, []);
  useEffect(() => { document.documentElement.classList.toggle("adm-folded", fold); }, [fold]);
  const toggleFold = () => setFold((f) => { try { localStorage.setItem("adm-fold", f ? "0" : "1"); } catch {} return !f; });
  useEffect(() => { setOpen(false); }, [path]);                       // إغلاق القائمة بعد التنقل
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  const visible = ITEMS
    .map((it) => (it.group === "inventory" ? { ...it, href: invTabsFor(roleKey, extra)[0]?.href ?? it.href } : it))
    .filter((it) => (it.group === "inventory" ? invTabsFor(roleKey, extra).length > 0 : canAccess(roleKey, it.href, extra)))
    .map((it) => (it.href === "/admin/staff" && roleKey !== "owner" ? { ...it, label: "تغيير كلمة المرور" } : it));
  const current = ITEMS.filter((it) => (it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/"))).sort((a, b) => b.href.length - a.href.length)[0];
  const invTab = isInvPath(path) ? INV_TABS.find((t) => invTabActive(path, t)) : undefined;
  const finTab = isFinPath(path) ? FIN_TABS.find((t) => finTabActive(path, t)) : undefined;
  const invTitle = isInvPath(path) ? `إدارة المخزون${invTab ? ` · ${invTab.label}` : ""}` : isFinPath(path) ? `الإدارة المالية${finTab ? ` · ${finTab.label}` : ""}` : isOrdPath(path) ? `طلبات المتجر · ${ORD_TABS.find((t) => path === t.href || path.startsWith(t.href + "/"))?.label ?? ""}` : isMktPath(path) ? `إدارة التسويق · ${MKT_TABS.find((t) => path === t.href || path.startsWith(t.href + "/"))?.label ?? ""}` : undefined;
  return (
    <>
    <header className="adm-mbar no-print">
      <button type="button" className="adm-burger" onClick={() => setOpen(true)} aria-label="فتح القائمة" aria-expanded={open}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h10" /></svg>
      </button>
      <span className="adm-mbar-title">{invTitle ?? current?.label ?? "لوحة الإدارة"}</span>
      <Link href="/admin" aria-label="لوحة المؤشرات"><img src="/icons/logo-mark.svg" alt="" className="adm-mbar-logo" /></Link>
    </header>
    {open && <div className="adm-scrim no-print" onClick={() => setOpen(false)} aria-hidden />}
    <aside className={`adm-side no-print${open ? " open" : ""}`}>
      <button type="button" className="adm-close" onClick={() => setOpen(false)} aria-label="إغلاق القائمة">✕</button>
      <button type="button" className="adm-fold" onClick={toggleFold} aria-label={fold ? "توسيع القائمة" : "طي القائمة"} title={fold ? "توسيع القائمة" : "طي القائمة"}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M15 4v16" />{fold ? <path d="m9 10-2 2 2 2" /> : <path d="m7 10 2 2-2 2" />}</svg>
      </button>
      <Link href="/admin" className="adm-brand" aria-label="لوحة الإدارة">
        <span className="adm-brand-tile"><img src="/icons/logo-mark.svg" alt="" aria-hidden="true" /></span>
        <span className="adm-brand-t"><b>شغلات بنات</b><span>لوحة الإدارة</span></span>
      </Link>
      <nav className="adm-nav" aria-label="لوحة الإدارة">
        {visible.map((it) => {
          const on = it.group === "inventory" ? isInvPath(path) : it.group === "finance" ? isFinPath(path) : it.group === "orders" ? isOrdPath(path) : it.group === "marketing" ? isMktPath(path) : it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
          return (
            <Link key={it.href} href={it.href} className={`adm-ni${on ? " on" : ""}`} title={fold ? it.label : undefined} aria-current={on ? "page" : undefined}>
              <span className="adm-ni-ic"><Icon name={it.icon} size={19} stroke={2} /></span>
              <span className="adm-ni-t">{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="adm-me">
        <span className="adm-me-av">{name[0]}</span>
        <span className="adm-me-t"><b>{name}</b><span>{role}</span></span>
        <Link href="/" className="adm-me-btn" aria-label="عرض المتجر" title="عرض المتجر"><Icon name="globe" size={18} stroke={2} /></Link>
        <AdminLogout compact />
      </div>
    </aside>
    </>
  );
}
