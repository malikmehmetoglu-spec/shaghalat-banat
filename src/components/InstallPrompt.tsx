"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "sb-install-dismissed";
const COOLDOWN = 6 * 3600 * 1000; // تظهر مجدداً كل 6 ساعات لمن لم تثبّت

function dismissedRecently() {
  try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < COOLDOWN; } catch { return false; }
}
function remember() { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* */ } }

/** نافذة تدعو لتثبيت التطبيق على الهاتف — أندرويد: زر تثبيت مباشر · آيفون: خطوات «إضافة إلى الشاشة الرئيسية» */
export function InstallPrompt() {
  const t = useT();
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (standalone || dismissedRecently()) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const mobile = isIos || /android|mobile/i.test(navigator.userAgent);
    setIos(isIos);
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => { setShow(false); remember(); };
    window.addEventListener("appinstalled", onInstalled);
    const timer = mobile ? setTimeout(() => setShow(true), 1000) : undefined;
    return () => { window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("appinstalled", onInstalled); if (timer) clearTimeout(timer); };
  }, []);

  // على الكمبيوتر: نظهر فقط إن كان المتصفح يدعم التثبيت
  useEffect(() => { if (evt && !show && !dismissedRecently()) { const x = setTimeout(() => setShow(true), 1000); return () => clearTimeout(x); } }, [evt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;
  const close = () => { setShow(false); remember(); };
  const install = async () => {
    if (evt) { await evt.prompt(); const r = await evt.userChoice; setEvt(null); if (r.outcome === "accepted") { setShow(false); remember(); } return; }
    setSteps(true);
  };

  return (
    <div className="ip-back" role="dialog" aria-modal="true" aria-labelledby="ip-title" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ip-card">
        <button className="ip-x" onClick={close} aria-label={t("إغلاق")}>✕</button>
        <div className="ip-arch"><img src="/icons/logo-mark.svg" alt="" width={74} height={74} /></div>
        <h2 id="ip-title" className="ip-title">{t("شغلات بنات صار عندها تطبيق!")}</h2>
        <p className="ip-text">{t("ثبّتي التطبيق على هاتفك لتصلك العروض الحصرية أولاً، وتتسوّقي بلمسة واحدة دون فتح المتصفح.")}</p>
        <ul className="ip-perks">
          <li>✨ {t("عروض خاصة بالتطبيق")}</li>
          <li>⚡ {t("أسرع وأخف")}</li>
          <li>🔔 {t("إشعار بكل جديد")}</li>
        </ul>
        {!steps ? (
          <button className="ip-btn" onClick={install}>{t("ثبّتي التطبيق الآن")}</button>
        ) : (
          <ol className="ip-steps">
            <li>{t("اضغطي زر المشاركة")} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg> {ios ? t("أسفل الشاشة") : t("في قائمة المتصفح")}</li>
            <li>{t("اختاري «إضافة إلى الشاشة الرئيسية»")}</li>
            <li>{t("اضغطي «إضافة» — وصار التطبيق على هاتفك 💗")}</li>
          </ol>
        )}
        <button className="ip-later" onClick={close}>{t("لاحقاً")}</button>
      </div>
    </div>
  );
}
