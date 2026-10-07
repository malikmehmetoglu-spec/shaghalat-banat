"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeaderClient } from "@/components/PageHeaderClient";
import { getBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";

type P = { full_name: string | null; phone: string | null; email: string | null; birth_date: string | null; usual_size: string | null };
const SIZES = ["S", "M", "L", "XL", "XXL"];

export function ProfileForm({ initial }: { initial: P }) {
  const t = useT();
  const router = useRouter();
  const [f, setF] = useState<P>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = getBrowserClient();
    const { data: u } = await sb.auth.getUser();
    const { error } = await sb.from("profiles").update({
      full_name: f.full_name?.trim() || null,
      email: f.email?.trim() || null,
      birth_date: f.birth_date || null,
      usual_size: f.usual_size,
    }).eq("id", u.user!.id);
    setBusy(false);
    if (error) { setMsg({ ok: false, t: t("تعذّر الحفظ، حاولي مجدداً") }); return; }
    setMsg({ ok: true, t: t("تم حفظ التغييرات") });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="page tight no-nav">
      <PageHeaderClient title={t("تعديل الملف الشخصي")} back="/account" />
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
        <span style={{ width: 104, height: 104, borderRadius: "50%", background: "linear-gradient(135deg,var(--banat-pink),var(--deep-berry))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
          {(f.full_name || t("ش"))[0]}
        </span>
      </div>
      <label className="field">{t("الاسم الكامل")}<input className="input" value={f.full_name ?? ""} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
      <label className="field">{t("رقم الهاتف")}<input className="input ltr" style={{ textAlign: "right", background: "var(--surface-admin)" }} value={f.phone ?? ""} readOnly placeholder={t("يُضاف عند الدخول برقم الهاتف")} /></label>
      <label className="field">{t("البريد الإلكتروني (اختياري)")}<input className="input ltr" style={{ textAlign: "right" }} type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@email.com" /></label>
      <label className="field">{t("تاريخ الميلاد (لهدية عيد ميلادك)")}<input className="input ltr" style={{ textAlign: "right" }} type="date" value={f.birth_date ?? ""} onChange={(e) => setF({ ...f, birth_date: e.target.value })} /></label>
      <div className="field">
        <span>{t("مقاسك المعتاد")}</span>
        <div style={{ display: "flex", gap: 10 }}>
          {SIZES.map((s) => <button key={s} type="button" className={`size${f.usual_size === s ? " on" : ""}`} style={{ flex: 1 }} onClick={() => setF({ ...f, usual_size: s })}>{s}</button>)}
        </div>
        <span className="caption" style={{ fontWeight: 400 }}>{t("نستخدمه لاقتراح المقاس المناسب لك تلقائياً")}</span>
      </div>
      {msg && <div className={`alert ${msg.ok ? "tone-success" : "tone-danger"}`} role="status">{msg.t}</div>}
      <div className="action-bar"><button type="submit" className="btn cta block" disabled={busy}>{busy ? t("جارٍ الحفظ…") : t("حفظ التغييرات")}</button></div>
    </form>
  );
}
