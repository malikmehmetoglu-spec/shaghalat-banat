export type StaffRole = "owner" | "manager" | "sales" | "marketing" | "inventory" | "accountant" | "cashier";

/** أقسام لوحة الإدارة القابلة للمنح */
export const SECTIONS = [
  { key: "pos", label: "نقطة البيع والمرتجعات" },
  { key: "orders", label: "طلبات المتجر" },
  { key: "products", label: "المنتجات" },
  { key: "inventory", label: "إدارة المخزون" },
  { key: "marketing", label: "إدارة التسويق" },
  { key: "finance", label: "الإدارة المالية" },
  { key: "settings", label: "إعدادات المتجر" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];

/** الصلاحيات الأساسية لكل دور — ويستطيع المدير العام إضافة أقسام أخرى لكل موظفة */
export const ROLE_BASE: Record<string, SectionKey[]> = {
  manager: ["products", "orders"],
  sales: ["pos"],
  marketing: ["marketing"],
  inventory: ["inventory", "products"],
  cashier: ["pos"],
  accountant: ["finance"],
};

/** أي قسم يحكم كل مسار (أول بادئة مطابقة) — "*" متاح لكل الفريق */
const PATHS: [string, SectionKey[] | "*"][] = [
  ["/admin/finance", ["finance"]],
  ["/admin/staff", "*"], // غير المدير العام يرى تغيير كلمة مروره فقط
  ["/admin/pos", ["pos"]],
  ["/admin/returns", ["pos"]],
  ["/admin/orders", ["orders"]],
  ["/admin/shop-orders", ["orders"]],
  ["/admin/customers", ["marketing"]],
  ["/admin/coupons", ["marketing"]],
  ["/admin/push", ["marketing"]],
  ["/admin/settings", ["settings"]],
  ["/admin/products", ["products"]],
  ["/admin/barcodes", ["products", "inventory"]],
  ["/admin/inventory", ["inventory"]],
  ["/admin", "*"],
];

export function sectionsOf(role: string, extra: string[] | null | undefined = []): SectionKey[] {
  if (role === "owner") return SECTIONS.map((s) => s.key);
  return [...new Set([...(ROLE_BASE[role] ?? []), ...((extra ?? []) as SectionKey[])])];
}

export function canAccess(role: string, path: string, extra: string[] | null | undefined = []) {
  if (role === "owner") return true;
  if (!role || role === "customer") return false;
  const rule = PATHS.find(([p]) => path === p || path.startsWith(p + "/"));
  if (!rule) return false;
  if (rule[1] === "*") return true;
  const mine = sectionsOf(role, extra);
  return rule[1].some((k) => mine.includes(k));
}
