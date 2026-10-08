import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { NextResponse, type NextRequest } from "next/server";

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

  let user = null;
  try { user = (await supabase.auth.getUser()).data.user; } catch { /* لا نُسقط الموقع إن تعذّر الاتصال */ }
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith("/admin") ? "/admin-login" : "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|sw.js|manifest.webmanifest|favicon.ico).*)"],
};
