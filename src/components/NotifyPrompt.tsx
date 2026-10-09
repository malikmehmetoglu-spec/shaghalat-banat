"use client";
import { useEffect, useState } from "react";
import { enablePush } from "./PushToggle";
import { useLang, useT } from "./LangProvider";

const KEY = "sb-notify-dismissed";
const COOLDOWN = 6 * 3600 * 1000; // تتكرر كل 6 ساعات حتى تُفعَّل
const isNative = () => !!(window as any).Capacitor?.isNativePlatform?.();
function recently() { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < COOLDOWN; } catch { return false; } }
function remember() { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* */ } }

/** لمن ثبّتت التطبيق ولم تفعّل الإشعارات: نافذة تدعوها للتفعيل */
export function NotifyPrompt() {
  const t = useT();
  const lang = useLang();
  const [show, setShow] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (recently()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      if (isNative()) {
        try {
          const { PushNotifications } = await import("@capacitor/push-notifications");
          const p = await PushNotifications.checkPermissions();
          if (p.receive === "granted") return;
          setBlocked(p.receive === "denied");
        } catch { return; }
      } else {
        const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
        if (!installed || typeof Notification === "undefined" || !("serviceWorker" in navigator)) return;
        if (Notification.permission === "granted") {
          const sub = await navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).catch(() => null);
          if (sub) return;
        }
        setBlocked(Notification.permission === "denied");
      }
      timer = setTimeout(() => setShow(true), 1000);
    })();
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  if (!show) return null;
  const close = () => { setShow(false); remember(); };
  const enable = async () => {
    setBusy(true);
    const r = await enablePush(lang);
    setBusy(false);
    if (r === "on") { setShow(false); return; }
    if (r === "denied") setBlocked(true);
  };

  return (
    <div className="ip-back" role="dialog" aria-modal="true" aria-labelledby="np-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ip-card">
        <button className="ip-x" onClick={close} aria-label={t("إغلاق")}>✕</button>
        <div className="ip-arch np-bell" aria-hidden>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#8e0254" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          <span className="np-dot" />
        </div>
        <h2 id="np-title" className="ip-title">{t("لا تفوّتي أي عرض!")}</h2>
        <p className="ip-text">{t("فعّلي الإشعارات لتعرفي أولاً بالخصومات والوصول الجديد، ولتتابعي حالة طلبك لحظة بلحظة.")}</p>
        <ul className="ip-perks">
          <li>🏷️ {t("خصومات حصرية")}</li>
          <li>🆕 {t("وصل حديثاً")}</li>
          <li>📦 {t("حالة طلبك")}</li>
        </ul>
        {!blocked ? (
          <button className="ip-btn" onClick={enable} disabled={busy}>{busy ? t("جارٍ التفعيل…") : t("فعّلي الإشعارات")}</button>
        ) : (
          <ol className="ip-steps">
            <li>{t("الإشعارات محظورة حالياً على هذا الجهاز")}</li>
            <li>{t("افتحي الإعدادات ← الإشعارات ← شغلات بنات")}</li>
            <li>{t("فعّلي «السماح بالإشعارات» 💗")}</li>
          </ol>
        )}
        <button className="ip-later" onClick={close}>{t("لاحقاً")}</button>
      </div>
    </div>
  );
}
