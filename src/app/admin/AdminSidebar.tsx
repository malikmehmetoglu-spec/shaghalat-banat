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
const GROUPS: { title: string; items: Item[]; finance?: boolean; owner?: boolean }[] = [
  { title: "عام", items: [{ href: "/admin", label: "لوحة المؤشرات", icon: "grid", exact: true }] },
  { title: "المبيعات", items: [
    { href: "/admin/shop-orders", label: "طلبات المتجر", icon: "truck", group: "orders" },
    { href: "/admin/pos", label: "نقطة البيع (المحل)", icon: "card" },
  ] },
  { title: "التسويق", items: [
    { href: "/admin/customers", label: "إدارة التسويق", icon: "bell", group: "marketing" },
  ] },
  { title: "الكتالوج", items: [
    { href: "/admin/products", label: "المنتجات", icon: "tag" },
  ] },
  { title: "المخزون", items: [
    { href: "/admin/inventory", label: "إدارة المخزون", icon: "boxes", group: "inventory" },
  ] },
  { title: "المالية", finance: true, items: [
    { href: "/admin/finance", label: "الإدارة المالية", icon: "card", group: "finance" },
  ] },
  { title: "النظام", items: [
    { href: "/admin/settings", label: "إعدادات المتجر", icon: "edit" },
    { href: "/admin/staff", label: "الموظفون والأدوار", icon: "shield" },
  ] },
];

export function AdminSidebar({ name, role, roleKey }: { name: string; role: string; roleKey: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);                       // إغلاق القائمة بعد التنقل
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  const current = GROUPS.flatMap((g) => g.items).filter((it) => (it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/"))).sort((a, b) => b.href.length - a.href.length)[0];
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
      <div className="adm-brand">
        <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" className="adm-brand-mark" />
        <img src="/icons/logo-stacked.svg" alt="شغلات بنات" className="adm-brand-logo" />
        <span className="adm-brand-tag">لوحة الإدارة</span>
      </div>
      {GROUPS.map((g) => ({ ...g, items: g.items.map((it) => (it.group === "inventory" ? { ...it, href: invTabsFor(roleKey)[0]?.href ?? it.href } : it)).filter((it) => (it.group === "inventory" ? invTabsFor(roleKey).length > 0 : canAccess(roleKey, it.href))).map((it) => (it.href === "/admin/staff" && roleKey !== "owner" ? { ...it, label: "تغيير كلمة المرور" } : it)) })).filter((g) => g.items.length).map((g) => (
        <div key={g.title} style={{ display: "contents" }}>
          <span className="adm-ng">{g.title}</span>
          {g.items.map((it) => {
            const on = it.group === "inventory" ? isInvPath(path) : it.group === "finance" ? isFinPath(path) : it.group === "orders" ? isOrdPath(path) : it.group === "marketing" ? isMktPath(path) : it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
            return (
              <Link key={it.href} href={it.href} className={`adm-ni${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
                <Icon name={it.icon} /> {it.label}
              </Link>
            );
          })}
        </div>
      ))}
      <div style={{ marginTop: "auto", paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href="/" className="adm-ni"><Icon name="back" stroke={2} /> عرض المتجر</Link>
        <AdminLogout />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, background: "var(--light-blush)" }}>
          <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", background: "var(--magenta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{name[0]}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            <span style={{ fontSize: 12, lineHeight: 1.4, color: "var(--text-subtle)" }}>{role}</span>
          </span>
        </div>
      </div>
    </aside>
    </>
  );
}
