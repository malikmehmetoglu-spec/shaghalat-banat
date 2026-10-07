import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "owner" | "sales" | "inventory" | "accountant" | "cashier";

export const ROLE_LABEL: Record<string, string> = {
  customer: "عميلة",
  owner: "مديرة",
  sales: "مشرفة مبيعات",
  inventory: "أمينة مخزون",
  accountant: "محاسبة",
  cashier: "بائعة / كاشير",
};

/** يتحقق أن المستخدمة من فريق العمل، ويعيد ملفها وعميل Supabase. */
export async function requireStaff() {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) redirect("/login?next=/admin");
  const { data: profile } = await sb.from("profiles").select("id,full_name,role,phone,email").eq("id", u.user.id).maybeSingle();
  if (!profile || profile.role === "customer") redirect("/admin-no-access");
  return { sb, profile, user: u.user };
}

export async function getLocations() {
  const sb = await createClient();
  const { data } = await sb.from("locations").select("id,name,kind,address,sells_online").order("created_at");
  return data ?? [];
}

export function errMsg(e: { message?: string } | null | undefined, fallback = "حدث خطأ، حاولي مجدداً") {
  if (!e?.message) return fallback;
  // رسائل الدوال عربية أصلاً؛ رسائل النظام الإنجليزية نستبدلها برسالة عامة
  return /[؀-ۿ]/.test(e.message) ? e.message : fallback;
}
