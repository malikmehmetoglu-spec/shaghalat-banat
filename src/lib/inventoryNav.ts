import { canAccess } from "@/lib/access";

/** تبويبات «إدارة المخزون» — الروابط نفسها لم تتغيّر، فالصلاحيات والروابط الداخلية تبقى كما هي */
export const INV_TABS = [
  { href: "/admin/inventory", label: "نظرة عامة", icon: "grid", exact: true },
  { href: "/admin/inventory/locations", label: "المواقع والمستودعات", icon: "pin" },
  { href: "/admin/inventory/moves", label: "الحركات والتحويل", icon: "return" },
  { href: "/admin/inventory/count", label: "الجرد والتسويات", icon: "check" },
  { href: "/admin/inventory/alerts", label: "تنبيهات النقص", icon: "info" },
  { href: "/admin/inventory/suppliers", label: "الموردون والمشتريات", icon: "truck" },
  { href: "/admin/barcodes", label: "الباركود والملصقات", icon: "filter" },
] as const;

export const invTabsFor = (role: string) => INV_TABS.filter((t) => canAccess(role, t.href));
export const isInvPath = (path: string) => INV_TABS.some((t) => path === t.href || path.startsWith(t.href + "/"));
export const invTabActive = (path: string, t: (typeof INV_TABS)[number]) =>
  "exact" in t && t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
