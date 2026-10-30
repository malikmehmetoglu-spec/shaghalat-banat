/** تبويبات «طلبات المتجر» — الروابط لم تتغيّر فتبقى روابط الطلبات (?id=) في اللوحة والعملاء والمرتجعات تعمل */
export const ORD_TABS = [
  { href: "/admin/shop-orders", label: "لوحة الطلبات", icon: "truck" },
  { href: "/admin/orders", label: "سجل كل الطلبات", icon: "bag" },
] as const;
export const isOrdPath = (p: string) => ORD_TABS.some((t) => p === t.href || p.startsWith(t.href + "/"));
