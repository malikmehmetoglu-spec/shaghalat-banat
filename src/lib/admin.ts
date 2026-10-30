import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import { canAccess } from "./access";
export type { StaffRole } from "./access";

export const ROLE_LABEL: Record<string, string> = {
  customer: "عميلة",
  owner: "مدير عام",
  manager: "مديرة المتجر",
  sales: "موظفة مبيعات",
  marketing: "موظفة تسويق",
  inventory: "موظفة المستودع",
  accountant: "محاسبة",
  cashier: "موظفة مبيعات",
};

/** يتحقق أن المستخدمة من فريق العمل، ويعيد ملفها وعميل Supabase. */

/** path: مسار القسم المطلوب؛ تُطبَّق صلاحيات الدور والصلاحيات الإضافية */
export async function requireStaff(path?: string) {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) redirect("/admin-login");
  const { data: profile } = await sb.from("profiles").select("id,full_name,role,phone,email,extra_access").eq("id", u.user.id).maybeSingle();
  if (!profile || profile.role === "customer") redirect("/admin-no-access");
  if (path && !canAccess(profile.role, path, profile.extra_access)) redirect("/admin?denied=1");
  return { sb, profile, user: u.user };
}

export async function getLocations() {
  const sb = await createClient();
  const { data } = await sb.from("locations").select("id,name,kind,address,sells_online").is("archived_at", null).order("created_at");
  return data ?? [];
}

export function errMsg(e: { message?: string } | null | undefined, fallback = "حدث خطأ، حاولي مجدداً") {
  if (!e?.message) return fallback;
  // رسائل الدوال عربية أصلاً؛ رسائل النظام الإنجليزية نستبدلها برسالة عامة
  return /[؀-ۿ]/.test(e.message) ? e.message : fallback;
}

export { canAccess };

/** سعر صرف الدولار الحالي (ليرة جديدة) */
export async function getFx() {
  const sb = await createClient();
  const { data } = await sb.from("fx_settings").select("usd_rate,auto,source,updated_at,last_error").eq("id", 1).maybeSingle();
  return { rate: Number(data?.usd_rate ?? 0), auto: data?.auto ?? true, source: data?.source ?? null, updatedAt: data?.updated_at ?? null, error: data?.last_error ?? null };
}
