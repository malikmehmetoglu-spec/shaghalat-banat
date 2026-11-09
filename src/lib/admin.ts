import { cache } from "react";
import { headers } from "next/headers";
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
/** هوية الموظف تُجلب مرة واحدة لكل طلب (يتشاركها التخطيط والصفحة وكل الدوال) */
const staffSession = cache(async () => {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return { sb, user: null, profile: null };
  const { data: profile } = await sb.from("profiles").select("id,full_name,role,phone,email,extra_access").eq("id", u.user.id).maybeSingle();
  return { sb, user: u.user, profile };
});

export async function requireStaff(path?: string) {
  const { sb, user, profile } = await staffSession();
  if (!user) redirect("/admin-login");
  if (!profile || profile.role === "customer") redirect("/admin-no-access");
  // صلاحية القسم: المسار المطلوب صراحة، وإلا مسار الصفحة الحالية (يضعه الـ middleware)
  const where = path ?? (await headers()).get("x-admin-path") ?? undefined;
  if (where && where !== "/admin" && !canAccess(profile.role, where, profile.extra_access)) redirect("/admin?denied=1");
  return { sb, profile, user };
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
