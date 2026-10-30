"use client";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { useLang, useT } from "./LangProvider";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BFRj0UmxX2H-IhW0tUf8AVF9a_S3FOq6HTx4ce-w07aBpwHHfx081aWJ4d46UI9w-HvFFQvRUik-eYfO-sBDU-A";

const isNative = () => typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
function b64ToBytes(s: string) {
  const b = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** عنوان اشتراك هذا الجهاز إن وُجد */
async function deviceEndpoint(): Promise<{ kind: "web" | "fcm"; endpoint: string; keys: unknown } | null> {
  try {
    if (isNative()) { const e = localStorage.getItem("push-endpoint"); return e ? { kind: "fcm", endpoint: e, keys: null } : null; }
    if (!("serviceWorker" in navigator) || typeof Notification === "undefined" || Notification.permission !== "granted") return null;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return null;
    const j = sub.toJSON();
    return { kind: "web", endpoint: j.endpoint!, keys: j.keys };
  } catch { return null; }
}

/** تسجيل الخروج الآمن: يُفصل الجهاز عن الحساب أولاً حتى لا تصل إشعاراته لمن يستخدم الجهاز بعده */
export async function signOutSafely() {
  const sb = getBrowserClient();
  const d = await deviceEndpoint();
  if (d) await sb.rpc("unlink_push", { p_endpoint: d.endpoint }).then(() => {}, () => {});
  await sb.auth.signOut();
}

/** يربط اشتراك الجهاز بالحساب المسجّل حالياً (يُستدعى عند تسجيل الدخول) */
export async function syncPushOwner(lang: string) {
  const d = await deviceEndpoint();
  if (!d) return;
  await getBrowserClient().rpc("register_push", { p_kind: d.kind, p_endpoint: d.endpoint, p_keys: d.keys, p_lang: lang }).then(() => {}, () => {});
}

/** تفعيل الإشعارات: Web Push في المتصفح/PWA، و FCM داخل تطبيق Android/iOS */
export async function enablePush(lang: string): Promise<"on" | "denied" | "unsupported" | "error"> {
  const sb = getBrowserClient();
  try {
    if (isNative()) {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return "denied";
      await new Promise<void>((resolve, reject) => {
        PushNotifications.addListener("registration", async (tk) => { try { localStorage.setItem("push-endpoint", tk.value); } catch {} await sb.rpc("register_push", { p_kind: "fcm", p_endpoint: tk.value, p_keys: null, p_lang: lang }); resolve(); });
        PushNotifications.addListener("registrationError", () => reject());
        PushNotifications.register();
      });
      PushNotifications.addListener("pushNotificationActionPerformed", (a) => { const l = a.notification.data?.link; if (l) location.href = l; });
      return "on";
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) }));
    const j = sub.toJSON();
    const { error } = await sb.rpc("register_push", { p_kind: "web", p_endpoint: j.endpoint, p_keys: j.keys, p_lang: lang });
    return error ? "error" : "on";
  } catch {
    return "error";
  }
}

export function PushToggle() {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useState<"idle" | "on" | "denied" | "unsupported" | "error" | "busy">("idle");

  useEffect(() => {
    if (isNative()) return;
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) { setState("unsupported"); return; }
    if (Notification.permission === "denied") setState("denied");
    else if (Notification.permission === "granted") navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => s && setState("on"));
  }, []);

  const msg: Record<string, string> = {
    on: t("الإشعارات مفعّلة على هذا الجهاز"),
    denied: t("الإشعارات محظورة من إعدادات المتصفح"),
    unsupported: t("على iPhone: أضيفي التطبيق إلى الشاشة الرئيسية أولاً ثم فعّلي الإشعارات"),
    error: t("تعذّر تفعيل الإشعارات، حاولي مجدداً"),
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" className={state === "on" ? "btn secondary block" : "btn block"} style={{ height: 48 }} disabled={state === "busy" || state === "on"}
        onClick={async () => { setState("busy"); setState(await enablePush(lang)); }}>
        {state === "on" ? t("الإشعارات مفعّلة ✓") : state === "busy" ? t("جارٍ التفعيل…") : t("تفعيل الإشعارات")}
      </button>
      {msg[state] && state !== "on" && <span className="caption" style={{ lineHeight: 1.6 }}>{msg[state]}</span>}
      {state === "idle" && <span className="caption" style={{ lineHeight: 1.6 }}>{t("نبلغك بحالة طلبك والعروض الجديدة")}</span>}
    </div>
  );
}
