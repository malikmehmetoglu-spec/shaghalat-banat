/** تبويبات «إدارة التسويق» — الروابط لم تتغيّر فتبقى الصلاحيات والروابط الداخلية كما هي */
export const MKT_TABS = [
  { href: "/admin/customers", label: "العملاء", icon: "user" },
  { href: "/admin/coupons", label: "الكوبونات", icon: "tag" },
  { href: "/admin/push", label: "إرسال الإشعارات", icon: "bell" },
  { href: "/admin/sms", label: "رسالة جماعية SMS", icon: "chat" },
] as const;
export const isMktPath = (p: string) => MKT_TABS.some((t) => p === t.href || p.startsWith(t.href + "/"));
