import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { runDueCampaigns } from "@/lib/push";

/** يُستدعى من خدمة جدولة خارجية (مثل cron-job.org) كل 5–15 دقيقة لإرسال الإشعارات المجدولة.
 *  يتطلب: SUPABASE_SERVICE_ROLE_KEY و CRON_SECRET في متغيرات البيئة، ويُمرَّر ?key=CRON_SECRET */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  const secret = process.env.CRON_SECRET, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !service || key !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = createClient(SUPABASE_URL, service, { auth: { persistSession: false } });
  const n = await runDueCampaigns(sb);
  return NextResponse.json({ ok: true, sent: n });
}
