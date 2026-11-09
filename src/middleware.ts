import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { NextResponse, type NextRequest } from "next/server";

/** يحدّث جلسة Supabase مع كل طلب، ويحمي الصفحات التي تحتاج تسجيل دخول. */
const PROTECTED = ["/admin", "/orders", "/account", "/favorites", "/notifications"];

export async function middleware(request: NextRequest) {
  if (request.headers.has("x-admin-path")) request.headers.delete("x-admin-path"); // لا يُقبل من المتصفح
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  let user = null;
  try {
    // قراءة محلية سريعة للجلسة (تُجدَّد فقط عند انتهائها) — التحقق الكامل والصلاحيات تتم في الخادم داخل الصفحة نفسها
    user = (await supabase.auth.getSession()).data.session?.user ?? null;
  } catch { /* لا نُسقط الموقع إن تعذّر الاتصال */ }
  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith("/admin") ? "/admin-login" : "/login";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  // مسار صفحة الإدارة يُمرَّر للخادم ليتحقق من صلاحية القسم (requireStaff) دون رحلة إضافية هنا
  if (path.startsWith("/admin")) {
    const h = new Headers(request.headers);
    h.set("x-admin-path", path);
    const next = NextResponse.next({ request: { headers: h } });
    response.cookies.getAll().forEach((c) => next.cookies.set(c));
    return next;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|sw.js|manifest.webmanifest|favicon.ico).*)"],
};
