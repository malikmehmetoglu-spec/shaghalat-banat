/** تبويبات «الإدارة المالية» — كلها تحت /admin/finance فتتبع صلاحيته نفسها (المدير والمحاسب) */
export const FIN_TABS = [
  { href: "/admin/finance", label: "الرئيسية", icon: "grid", exact: true },
  { href: "/admin/finance/movements", label: "الحركات", icon: "sort" },
  { href: "/admin/finance/salaries", label: "الرواتب", icon: "user" },
  { href: "/admin/finance/consign", label: "تجار الأمانة", icon: "boxes" },
  { href: "/admin/finance/invoices", label: "الفواتير", icon: "bag" },
  { href: "/admin/finance/reports", label: "تقرير الأرباح", icon: "star" },
  { href: "/admin/finance/settings", label: "الإعدادات", icon: "shield" },
] as const;
export const isFinPath = (p: string) => p === "/admin/finance" || p.startsWith("/admin/finance/");
export const finTabActive = (p: string, t: (typeof FIN_TABS)[number]) => ("exact" in t && t.exact ? p === t.href : p === t.href || p.startsWith(t.href + "/"));
