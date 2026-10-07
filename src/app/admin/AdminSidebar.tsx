"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

type Item = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; exact?: boolean };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "عام", items: [{ href: "/admin", label: "لوحة المؤشرات", icon: "grid", exact: true }] },
  { title: "المبيعات", items: [
    { href: "/admin/orders", label: "الطلبات", icon: "bag" },
    { href: "/admin/customers", label: "العملاء", icon: "user" },
    { href: "/admin/pos", label: "نقطة البيع (المحل)", icon: "card" },
  ] },
  { title: "الكتالوج", items: [
    { href: "/admin/products", label: "المنتجات", icon: "tag" },
    { href: "/admin/catalog", label: "الأقسام والبانرات", icon: "star" },
    { href: "/admin/coupons", label: "الكوبونات", icon: "tag" },
  ] },
  { title: "المخزون", items: [
    { href: "/admin/inventory", label: "نظرة عامة", icon: "grid", exact: true },
    { href: "/admin/inventory/moves", label: "الحركات والتحويل", icon: "return" },
    { href: "/admin/inventory/count", label: "الجرد والتسويات", icon: "check" },
    { href: "/admin/inventory/alerts", label: "تنبيهات النقص", icon: "info" },
    { href: "/admin/inventory/suppliers", label: "الموردون والمشتريات", icon: "truck" },
    { href: "/admin/barcodes", label: "الباركود والملصقات", icon: "filter" },
  ] },
  { title: "النظام", items: [{ href: "/admin/staff", label: "الموظفون والأدوار", icon: "shield" }] },
];

export function AdminSidebar({ name, role }: { name: string; role: string }) {
  const path = usePathname();
  return (
    <aside className="adm-side no-print">
      <div className="adm-brand">
        <img src="/icons/logo-horizontal.svg" alt="شغلات بنات" style={{ height: 40, width: "auto", alignSelf: "flex-start" }} />
        <span style={{ fontSize: 12, lineHeight: 1.4, color: "var(--text-label)" }}>لوحة الإدارة</span>
      </div>
      {GROUPS.map((g) => (
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, background: "var(--light-blush)" }}>
          <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", background: "var(--magenta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{name[0]}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            <span style={{ fontSize: 12, lineHeight: 1.4, color: "var(--text-subtle)" }}>{role}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
