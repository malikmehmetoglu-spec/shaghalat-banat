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

/** تفعيل الإشعارات: Web Push في المتصفح/PWA، و FCM داخل تطبيق Android/iOS */
export async function enablePush(lang: string): Promise<"on" | "denied" | "unsupported" | "error"> {
  const sb = getBrowserClient();
  try {
    if (isNative()) {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return "denied";
      await new Promise<void>((resolve, reject) => {
        PushNotifications.addListener("registration", async (tk) => { await sb.rpc("register_push", { p_kind: "fcm", p_endpoint: tk.value, p_keys: null, p_lang: lang }); resolve(); });
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
