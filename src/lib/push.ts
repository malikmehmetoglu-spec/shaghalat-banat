import "server-only";
import { createSign } from "node:crypto";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

/** المفتاح العام آمن للنشر؛ الخاص يجب أن يُضبط في متغيرات البيئة على Vercel */
export const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BFRj0UmxX2H-IhW0tUf8AVF9a_S3FOq6HTx4ce-w07aBpwHHfx081aWJ4d46UI9w-HvFFQvRUik-eYfO-sBDU-A";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const FCM_SA = process.env.FCM_SERVICE_ACCOUNT || ""; // JSON حساب خدمة Firebase

export type PushMsg = { title: string; body: string; link?: string };
type Sub = { id: string; kind: string; endpoint: string; keys: { p256dh: string; auth: string } | null };

export const pushReady = () => ({ web: !!VAPID_PRIVATE, fcm: !!FCM_SA });

// ───────── FCM HTTP v1 ─────────
let fcmToken: { token: string; exp: number } | null = null;
async function fcmAccess(): Promise<{ token: string; project: string } | null> {
  if (!FCM_SA) return null;
  const sa = JSON.parse(FCM_SA) as { client_email: string; private_key: string; project_id: string };
  if (fcmToken && fcmToken.exp > Date.now() + 60_000) return { token: fcmToken.token, project: sa.project_id };
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token: string; expires_in: number };
  fcmToken = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return { token: j.access_token, project: sa.project_id };
}

/** يرسل لمجموعة اشتراكات، ويحذف المنتهية. يعيد عدد الناجح والفاشل. */
export async function sendToSubs(sb: SupabaseClient, subs: Sub[], msg: PushMsg) {
  if (VAPID_PRIVATE) webpush.setVapidDetails("mailto:hello@shaghalat-banat.com", VAPID_PUBLIC, VAPID_PRIVATE);
  const fcm = subs.some((s) => s.kind === "fcm") ? await fcmAccess() : null;
  let sent = 0, failed = 0;
  const dead: string[] = [];
  const payload = JSON.stringify({ title: msg.title, body: msg.body, link: msg.link || "/" });

  await Promise.all(subs.map(async (s) => {
    try {
      if (s.kind === "web") {
        if (!VAPID_PRIVATE || !s.keys) { failed++; return; }
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 86400 });
        sent++;
      } else {
        if (!fcm) { failed++; return; }
        const r = await fetch(`https://fcm.googleapis.com/v1/projects/${fcm.project}/messages:send`, {
          method: "POST",
          headers: { authorization: `Bearer ${fcm.token}`, "content-type": "application/json" },
          body: JSON.stringify({ message: { token: s.endpoint, notification: { title: msg.title, body: msg.body }, data: { link: msg.link || "/" } } }),
        });
        if (r.ok) sent++;
        else { failed++; if (r.status === 404 || r.status === 400) dead.push(s.id); }
      }
    } catch (e: any) {
      failed++;
      if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.id);
    }
  }));
  if (dead.length) await sb.from("push_subscriptions").delete().in("id", dead);
  return { sent, failed };
}

export async function pushToUser(sb: SupabaseClient, userId: string, msg: PushMsg) {
  const { data } = await sb.from("push_subscriptions").select("id,kind,endpoint,keys").eq("user_id", userId);
  if (!data?.length) return { sent: 0, failed: 0 };
  return sendToSubs(sb, data as Sub[], msg);
}

/** جمهور الحملة */
export async function audienceSubs(sb: SupabaseClient, audience: string, me?: string): Promise<Sub[]> {
  const cols = "id,kind,endpoint,keys,user_id";
  if (audience === "test") return ((await sb.from("push_subscriptions").select(cols).eq("user_id", me ?? "")).data ?? []) as Sub[];
  const all = ((await sb.from("push_subscriptions").select(cols).limit(10000)).data ?? []) as (Sub & { user_id: string | null })[];
  if (audience === "all") return all;
  if (audience === "staff") {
    const { data } = await sb.from("profiles").select("id").neq("role", "customer");
    const ids = new Set((data ?? []).map((p) => p.id));
    return all.filter((s) => s.user_id && ids.has(s.user_id));
  }
  const { data: buyers } = await sb.from("orders").select("user_id").not("user_id", "is", null).neq("status", "cancelled");
  const ids = new Set((buyers ?? []).map((o) => o.user_id));
  return audience === "buyers" ? all.filter((s) => s.user_id && ids.has(s.user_id)) : all.filter((s) => !s.user_id || !ids.has(s.user_id));
}

/** إرسال الحملات المجدولة التي حان وقتها */
export async function runDueCampaigns(sb: SupabaseClient) {
  const { data } = await sb.from("push_campaigns").select("*").is("sent_at", null).lte("scheduled_at", new Date().toISOString());
  for (const c of data ?? []) {
    const subs = await audienceSubs(sb, c.audience);
    const r = await sendToSubs(sb, subs, { title: c.title, body: c.body, link: c.link });
    await sb.from("push_campaigns").update({ sent_at: new Date().toISOString(), sent_count: r.sent, failed_count: r.failed }).eq("id", c.id);
  }
  return data?.length ?? 0;
}
