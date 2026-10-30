"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { useT } from "./LangProvider";

const GKEY = "sb-guest-info";
const local = (p: string) => p.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)).replace(/\D/g, "").replace(/^(00)?963/, "").replace(/^0+/, "");

/** بعد طلب الضيفة: إنشاء حساب برمز تحقق على نفس الرقم، ثم ضمّ طلباتها السابقة وهدية التسجيل */
export function AccountSignup({ percent, compact }: { percent: number; compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"intro" | "code" | "done">("intro");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ claimed: number; coupon?: string; percent?: number } | null>(null);
  useEffect(() => { try { const g = JSON.parse(localStorage.getItem(GKEY) || "{}"); if (g.phone) setPhone(local(g.phone)); } catch {} }, []);
  const full = () => "+963" + local(phone);

  async function sendCode() {
    setErr("");
    if (local(phone).length < 9) { setErr(t("أدخلي رقم هاتف صحيحاً")); return; }
    setBusy(true);
    const { error } = await getBrowserClient().auth.signInWithOtp({ phone: full() });
    setBusy(false);
    if (error) { setErr(t("تعذّر إرسال رمز التحقق حالياً، حاولي بعد قليل")); return; }
    setStep("code");
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const sb = getBrowserClient();
    const { error } = await sb.auth.verifyOtp({ phone: full(), token: code.trim(), type: "sms" });
    if (error) { setBusy(false); setErr(t("الرمز غير صحيح أو انتهت صلاحيته")); return; }
    const { data } = await sb.rpc("claim_my_orders");
    try { sessionStorage.setItem("sb-claimed", "1"); } catch {}
    setBusy(false); setRes((data as any) ?? { claimed: 0 }); setStep("done");
    router.refresh();
  }

  if (step === "done") return (
    <section className="su-card su-done">
      <span className="su-ic" aria-hidden="true">💗</span>
      <h2>{t("أهلاً بكِ في شغلات بنات!")}</h2>
      <p>{res && res.claimed > 0 ? t("أضفنا {n} من طلباتك إلى حسابك، وتستطيعين متابعتها الآن.", { n: res.claimed }) : t("حسابك جاهز، وستجدين طلباتك القادمة فيه.")}</p>
      {res?.coupon && <div className="su-gift"><span>{t("هديتك: خصم {p}% على طلبك القادم", { p: res.percent ?? percent })}</span><b className="ltr">{res.coupon}</b></div>}
      <Link href="/orders" className="btn cta block">{t("طلباتي")}</Link>
    </section>
  );

  return (
    <section className={`su-card${compact ? " compact" : ""}`}>
      <div className="su-top">
        <span className="su-ic" aria-hidden="true">✨</span>
        <div><h2>{t("احفظي طلبك وتابعيه بسهولة")}</h2><p>{t("أنشئي حسابك برقم هاتفك فقط، بلا كلمة مرور.")}</p></div>
      </div>
      {step === "intro" && <ul className="su-perks">
        <li>{t("تتبّعي كل طلباتك في مكان واحد")}</li>
        <li>{t("اطلبي مرة ثانية بضغطتين، عنوانك محفوظ")}</li>
        {percent > 0 && <li><b>{t("هدية: خصم {p}% على طلبك القادم", { p: percent })}</b></li>}
      </ul>}
      {step === "intro" ? (
        <div className="su-form">
          <span className="su-phone ltr"><span>+963</span><input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XX XXX XXX" aria-label={t("رقم الهاتف")} /></span>
          <button type="button" className="btn cta block" disabled={busy} onClick={sendCode}>{busy ? t("جارٍ الإرسال…") : t("أرسلي لي رمز التحقق")}</button>
        </div>
      ) : (
        <form className="su-form" onSubmit={verify}>
          <span className="caption">{t("أرسلنا رمز التحقق إلى {x}", { x: full() })}</span>
          <input className="su-code ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" autoFocus aria-label={t("رمز التحقق")} />
          <button type="submit" className="btn cta block" disabled={busy || code.length < 6}>{busy ? t("جارٍ التحقق…") : t("تأكيد وإنشاء الحساب")}</button>
          <button type="button" className="su-link" onClick={() => { setStep("intro"); setCode(""); }}>{t("تغيير الرقم")}</button>
        </form>
      )}
      {err && <div className="alert tone-danger" role="alert">{err}</div>}
    </section>
  );
}
