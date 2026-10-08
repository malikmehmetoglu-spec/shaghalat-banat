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
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--surface-admin)" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 32, padding: "36px 28px", boxShadow: "0 20px 60px rgba(142,2,84,.10)", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <img src="/icons/logo-horizontal.svg" alt="شغلات بنات" style={{ height: 48, width: "auto" }} />
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
