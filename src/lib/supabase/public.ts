import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** عميل عام بلا كوكيز — للبيانات العامة القابلة للتخزين المؤقت (لا جلسات) */
export const publicClient = () =>
  createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
