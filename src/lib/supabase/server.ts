import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** عميل Supabase لمكونات الخادم وإجراءات الخادم — يقرأ جلسة المستخدمة من الكوكيز. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // يُستدعى أحياناً من مكوّن خادم لا يسمح بالكتابة؛ الـ middleware يتولى تحديث الجلسة.
        }
      },
    },
  });
}
