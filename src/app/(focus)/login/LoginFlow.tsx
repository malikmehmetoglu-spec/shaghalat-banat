"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { getBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";

/** الدخول برقم الهاتف فقط + رمز تحقق (OTP) يصل عبر واتساب. لا بريد ولا كلمات مرور. */
export function LoginFlow({ next, initialError }: { next: string; initialError: string }) {
  const t = useT();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(initialError);

  const fullPhone = () => "+963" + phone.replace(/\D/g, "").replace(/^0+/, "");

  async function requestCode() {
    setErr("");
    if (phone.replace(/\D/g, "").length < 8) { setErr(t("أدخلي رقم هاتف صحيحاً")); return; }
    setBusy(true);
    const { error } = await getBrowserClient().auth.signInWithOtp({ phone: fullPhone() });
    setBusy(false);
    if (error) { setErr(t("تعذّر إرسال رمز التحقق حالياً، حاولي بعد قليل")); return; }
    setStep("verify");
  }
  async function send(e: React.FormEvent) { e.preventDefault(); await requestCode(); }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await getBrowserClient().auth.verifyOtp({ phone: fullPhone(), token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) { setErr(t("الرمز غير صحيح أو انتهت صلاحيته")); return; }
    router.replace(next);
    router.refresh();
  }

  const title = step === "verify" ? t("رمز التحقق") : t("أهلاً بكِ");
  const sub = step === "verify" ? t("أرسلنا رمز التحقق عبر واتساب إلى {x}", { x: fullPhone() }) : t("سجّلي دخولك برقم هاتفك لمتابعة طلباتك ومفضلتك");

  return (
    <main className="login-d" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(160deg,var(--banat-pink),var(--magenta) 55%,var(--deep-berry))", borderRadius: "0 0 40px 40px", padding: "40px 24px 36px", color: "#fff", display: "flex", flexDirection: "column", gap: 28 }}>
        <div className="row-between">
          {step === "enter"
            ? <Link href="/" className="icon-btn" aria-label={t("رجوع")} style={{ background: "rgba(255,255,255,.2)", boxShadow: "none", color: "#fff" }}><Icon name="back" stroke={2} /></Link>
            : <button type="button" className="icon-btn" aria-label={t("رجوع")} onClick={() => { setStep("enter"); setErr(""); }} style={{ background: "rgba(255,255,255,.2)", boxShadow: "none", color: "#fff" }}><Icon name="back" stroke={2} /></button>}
          <img src="/icons/logo-mark.svg" alt="" style={{ height: 44, width: "auto", filter: "brightness(0) invert(1)" }} />
        </div>
        <div className="title-block" style={{ gap: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.5 }}>{title}</h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.92 }}>{sub}</p>
        </div>
      </div>

      <div style={{ padding: "32px 24px 36px", display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        {step === "enter" && (
          <>
            <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <label className="field">{t("رقم الهاتف")}
                  <span className="ltr" style={{ display: "flex", alignItems: "center", gap: 10, height: 60, padding: "0 6px", borderRadius: 22, border: "1.5px solid var(--rosy-gray)" }}>
                    <span style={{ height: 46, padding: "0 14px", borderRadius: 16, background: "var(--light-blush)", display: "flex", alignItems: "center", fontSize: 15, fontWeight: 600, lineHeight: 1, color: "var(--deep-berry)", flexShrink: 0 }}>+963</span>
                    <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XX XXX XXX" style={{ flex: 1, minWidth: 0, height: 46, border: "none", outline: "none", fontSize: 17, letterSpacing: 1, background: "transparent", padding: "0 8px", fontWeight: 400 }} />
                  </span>
                </label>
                <span className="caption" style={{ lineHeight: 1.7 }}>{t("سيصلك رمز التحقق برسالة واتساب على هذا الرقم.")}</span>
              {err && <div className="alert tone-danger" role="alert">{err}</div>}
              <button type="submit" className="btn cta block" disabled={busy}>{busy ? t("جارٍ الإرسال…") : t("إرسال رمز التحقق")}</button>
            </form>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ flex: 1, height: 1, background: "var(--light-blush)" }} />
              <span className="caption">{t("أو")}</span>
              <span style={{ flex: 1, height: 1, background: "var(--light-blush)" }} />
            </div>
            <Link href="/" className="btn secondary block" style={{ height: 56 }}>{t("تصفّح كضيفة")}</Link>
          </>
        )}

        {step === "verify" && (
          <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <label className="field">{t("رمز التحقق")}
              <input className="input ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                style={{ height: 64, fontSize: 26, letterSpacing: 12, textAlign: "center", fontWeight: 600 }} placeholder="••••••" />
            </label>
            {err && <div className="alert tone-danger" role="alert">{err}</div>}
            <button type="submit" className="btn cta block" disabled={busy || code.length < 4}>{busy ? t("جارٍ التحقق…") : t("تأكيد ودخول")}</button>
            <button type="button" className="link-btn" onClick={requestCode} disabled={busy} style={{ alignSelf: "center" }}>{t("إعادة إرسال الرمز")}</button>
          </form>
        )}

        <p className="caption" style={{ marginTop: "auto", textAlign: "center", lineHeight: 1.8 }}>{t("بالمتابعة، أنتِ توافقين على")} <Link href="/about?tab=policies" style={{ fontWeight: 500 }}>{t("الشروط وسياسة الخصوصية")}</Link></p>
      </div>
    </main>
  );
}
