"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { AdminLogout } from "./AdminLogout";
import { canAccess } from "@/lib/access";

type Item = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; exact?: boolean };
const GROUPS: { title: string; items: Item[]; finance?: boolean; owner?: boolean }[] = [
  { title: "عام", items: [{ href: "/admin", label: "لوحة المؤشرات", icon: "grid", exact: true }] },
  { title: "المبيعات", items: [
    { href: "/admin/orders", label: "الطلبات", icon: "bag" },
    { href: "/admin/customers", label: "العملاء", icon: "user" },
    { href: "/admin/pos", label: "نقطة البيع (المحل)", icon: "card" },
    { href: "/admin/returns", label: "المرتجعات", icon: "return" },
  ] },
  { title: "الكتالوج", items: [
    { href: "/admin/products", label: "المنتجات", icon: "tag" },
    { href: "/admin/catalog", label: "الأقسام والبانرات", icon: "star" },
    { href: "/admin/coupons", label: "الكوبونات", icon: "tag" },
    { href: "/admin/push", label: "إرسال الإشعارات", icon: "bell" },
  ] },
  { title: "المخزون", items: [
    { href: "/admin/inventory", label: "نظرة عامة", icon: "grid", exact: true },
    { href: "/admin/inventory/locations", label: "المواقع والمستودعات", icon: "pin" },
    { href: "/admin/inventory/moves", label: "الحركات والتحويل", icon: "return" },
    { href: "/admin/inventory/count", label: "الجرد والتسويات", icon: "check" },
    { href: "/admin/inventory/alerts", label: "تنبيهات النقص", icon: "info" },
    { href: "/admin/inventory/suppliers", label: "الموردون والمشتريات", icon: "truck" },
    { href: "/admin/barcodes", label: "الباركود والملصقات", icon: "filter" },
  ] },
  { title: "المالية", finance: true, items: [
    { href: "/admin/finance", label: "نظرة عامة", icon: "grid", exact: true },
    { href: "/admin/finance/expenses", label: "المصاريف", icon: "minus" },
    { href: "/admin/finance/cash", label: "الصندوق والبنك", icon: "card" },
    { href: "/admin/finance/invoices", label: "الفواتير", icon: "bag" },
    { href: "/admin/finance/receivables", label: "لنا وعلينا", icon: "clock" },
    { href: "/admin/finance/reports", label: "تقرير الأرباح", icon: "star" },
    { href: "/admin/finance/settings", label: "الإعدادات", icon: "shield" },
  ] },
  { title: "النظام", items: [{ href: "/admin/staff", label: "الموظفون والأدوار", icon: "shield" }] },
];

export function AdminSidebar({ name, role, roleKey }: { name: string; role: string; roleKey: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);                       // إغلاق القائمة بعد التنقل
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  const current = GROUPS.flatMap((g) => g.items).filter((it) => (it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/"))).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <>
    <header className="adm-mbar no-print">
      <button type="button" className="adm-burger" onClick={() => setOpen(true)} aria-label="فتح القائمة" aria-expanded={open}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h10" /></svg>
      </button>
      <span className="adm-mbar-title">{current?.label ?? "لوحة الإدارة"}</span>
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
      {GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => canAccess(roleKey, it.href)).map((it) => (it.href === "/admin/staff" && roleKey !== "owner" ? { ...it, label: "تغيير كلمة المرور" } : it)) })).filter((g) => g.items.length).map((g) => (
        <div key={g.title} style={{ display: "contents" }}>
          <span className="adm-ng">{g.title}</span>
          {g.items.map((it) => {
            const on = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
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
