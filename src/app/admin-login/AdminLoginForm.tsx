"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";

/** دخول فريق العمل: اسم المستخدم (أو البريد) + كلمة المرور */
export function AdminLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const raw = login.trim().toLowerCase();
    const email = raw.includes("@") ? raw : `${raw}@shaghalat-banat.com`;
    const { error } = await getBrowserClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(/banned/i.test(error.message) ? "هذا الحساب موقوف، تواصلي مع المديرة" : "اسم المستخدم أو كلمة المرور غير صحيحة"); return; }
    router.replace(next);
    router.refresh();
  }

  return (
    <main style={{ position: "relative", overflow: "hidden", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: "40px 20px", background: "linear-gradient(160deg,var(--banat-pink),var(--magenta) 45%,var(--deep-berry))" }}>
      <img src="/icons/logo-mark.svg" alt="" aria-hidden="true" style={{ position: "absolute", height: "90vh", maxHeight: 820, width: "auto", insetInlineStart: "-8%", bottom: "-12%", opacity: 0.1, filter: "brightness(0) invert(1)", pointerEvents: "none" }} />
      <img src="/icons/logo-stacked.svg" alt="شغلات بنات" style={{ position: "relative", height: 170, width: "auto", filter: "brightness(0) invert(1) drop-shadow(0 10px 30px rgba(58,42,48,.25))" }} />
      <form onSubmit={submit} style={{ position: "relative", width: "100%", maxWidth: 420, background: "#fff", borderRadius: 32, padding: "32px 28px", boxShadow: "0 30px 70px rgba(58,42,48,.30)", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.5 }}>دخول لوحة الإدارة</h1>
          <p className="muted" style={{ margin: 0 }}>لفريق العمل فقط</p>
        </div>
        <label className="field">اسم المستخدم أو البريد
          <input className="input ltr" style={{ textAlign: "left" }} autoComplete="username" required value={login} onChange={(e) => setLogin(e.target.value)} placeholder="name@shaghalat-banat.com" />
        </label>
        <label className="field">كلمة المرور
          <input className="input ltr" style={{ textAlign: "left" }} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {err && <div className="alert tone-danger" role="alert">{err}</div>}
        <button type="submit" className="btn cta block" disabled={busy}>{busy ? "جارٍ الدخول…" : "دخول"}</button>
      </form>
    </main>
  );
}
