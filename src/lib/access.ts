type StaffRole = "owner" | "sales" | "inventory" | "accountant" | "cashier";

/** صلاحيات أقسام لوحة الإدارة حسب الدور (أول بادئة مطابقة هي المعتمدة) */
const ACCESS: [string, StaffRole[]][] = [
  ["/admin/finance", ["owner", "accountant"]],
  ["/admin/staff", ["owner", "sales", "inventory", "accountant", "cashier"]], // غير المدير يرى تغيير كلمة مروره فقط
  ["/admin/pos", ["owner", "sales", "cashier"]],
  ["/admin/orders", ["owner", "sales"]],
  ["/admin/customers", ["owner", "sales"]],
  ["/admin/returns", ["owner", "sales", "cashier"]],
  ["/admin/catalog", ["owner", "sales"]],
  ["/admin/coupons", ["owner", "sales"]],
  ["/admin/push", ["owner", "sales"]],
  ["/admin/products", ["owner", "sales", "inventory"]],
  ["/admin/barcodes", ["owner", "sales", "inventory", "cashier"]],
  ["/admin/inventory", ["owner", "inventory"]],
  ["/admin", ["owner", "sales", "inventory", "accountant", "cashier"]],
];
export function canAccess(role: string, path: string) {
  const rule = ACCESS.find(([p]) => path === p || path.startsWith(p + "/"));
  return rule ? rule[1].includes(role as StaffRole) : role === "owner";
}
