import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { NextResponse, type NextRequest } from "next/server";
import { canAccess } from "@/lib/access";

/** يحدّث جلسة Supabase مع كل طلب، ويحمي الصفحات التي تحتاج تسجيل دخول. */
const PROTECTED = ["/admin", "/checkout", "/orders", "/account", "/favorites", "/notifications"];

export async function middleware(request: NextRequest) {
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
    // الصفحات المحمية: تحقق كامل من الخادم. الصفحات العامة: قراءة محلية سريعة (تُجدَّد الجلسة فقط عند انتهائها)
    user = needsAuth
      ? (await supabase.auth.getUser()).data.user
      : (await supabase.auth.getSession()).data.session?.user ?? null;
  } catch { /* لا نُسقط الموقع إن تعذّر الاتصال */ }
  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith("/admin") ? "/admin-login" : "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  // صلاحيات أقسام لوحة الإدارة حسب الدور
  if (user && (path.startsWith("/admin/") )) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (prof?.role && prof.role !== "customer" && !canAccess(prof.role, path)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin"; url.search = "?denied=1";
      return NextResponse.redirect(url);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|sw.js|manifest.webmanifest|favicon.ico).*)"],
};
