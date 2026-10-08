"use client";
import { useState, useTransition } from "react";
import { setStaffActive, setStaffPassword, updateStaffRole, type ActionResult } from "../actions";
import { Switch } from "../Switch";

type S = { id: string; login: string; full_name: string | null; role: string; active: boolean; last: string };

export function StaffRow({ s, isOwner, isMe, roles }: { s: S; isOwner: boolean; isMe: boolean; roles: { value: string; label: string }[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setMsg(await fn()));
  const label = roles.find((r) => r.value === s.role)?.label ?? s.role;
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{s.full_name || "—"}{isMe ? " (أنت)" : ""}{msg && <div className="caption" style={{ color: msg.ok ? "var(--success-fg)" : "var(--danger-fg)" }}>{msg.message}</div>}</td>
      <td className="caption ltr" style={{ textAlign: "right" }}>{s.login}</td>
      <td>
        {isOwner && !isMe
          ? <select className="a-in" style={{ height: 36, minWidth: 130 }} defaultValue={s.role} disabled={pending} onChange={(e) => run(() => updateStaffRole(s.id, e.target.value))}>{roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
          : <span className="pill tone-brand">{label}</span>}
      </td>
      <td className="caption">{s.last}</td>
      <td>{isOwner && !isMe ? <Switch on={s.active} label="تفعيل الحساب" onChange={(v) => run(() => setStaffActive(s.id, v))} /> : <span className={`pill ${s.active ? "tone-success" : "tone-neutral"}`}>{s.active ? "فعّال" : "موقوف"}</span>}</td>
      {isOwner && (
        <td>{!isMe && <button type="button" className="btn soft" disabled={pending} onClick={() => {
          const p = prompt(`كلمة مرور جديدة لـ ${s.full_name || s.login} (6 أحرف على الأقل)`);
          if (p) run(() => setStaffPassword(s.id, p));
        }}>تغيير كلمة المرور</button>}</td>
      )}
    </tr>
  );
}

export function MyPassword() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="adm-h2">تغيير كلمة مروري</h2>
      <label className="a-field">كلمة المرور الجديدة<input className="a-in ltr" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} /></label>
      <label className="a-field">تأكيدها<input className="a-in ltr" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} /></label>
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
      <button type="button" className="btn" style={{ alignSelf: "flex-start" }} disabled={pending || p1.length < 6}
        onClick={() => { if (p1 !== p2) { setMsg({ ok: false, message: "كلمتا المرور غير متطابقتين" }); return; } start(async () => { const r = await setStaffPassword("", p1); setMsg(r); if (r.ok) { setP1(""); setP2(""); } }); }}>حفظ</button>
    </div>
  );
}
