"use client";
import { useEffect, useState, useTransition } from "react";
import { setStaffAccess, setStaffActive, setStaffPassword, updateStaffRole, type ActionResult } from "../actions";
import { Switch } from "../Switch";

type S = { id: string; login: string; full_name: string | null; role: string; extra_access: string[] | null; active: boolean; last: string };
type Sec = { key: string; label: string };

export function StaffRow({ s, isOwner, isMe, roles, sections, base }: { s: S; isOwner: boolean; isMe: boolean; roles: { value: string; label: string }[]; sections: Sec[]; base: Record<string, string[]> }) {
  const [role, setRole] = useState(s.role);
  const [extra, setExtra] = useState<string[]>(s.extra_access ?? []);
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
          ? <select className="a-in" style={{ height: 36, minWidth: 130 }} defaultValue={s.role} disabled={pending} onChange={(e) => { const v = e.target.value; setRole(v); run(() => updateStaffRole(s.id, v)); }}>{roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
          : <span className="pill tone-brand">{label}</span>}
      </td>
      <td>
        {role === "owner" ? <span className="caption">كل الأقسام</span> : (
          <div className="stf-chips">
            {sections.map((x) => {
              const fixed = (base[role] ?? []).includes(x.key), on = fixed || extra.includes(x.key);
              const can = isOwner && !isMe && !fixed;
              return (
                <button key={x.key} type="button" disabled={!can || pending} title={fixed ? "من صلاحيات الدور" : can ? (on ? "إزالة الصلاحية" : "منح الصلاحية") : undefined}
                  className={`stf-chip${on ? " on" : ""}${fixed ? " fixed" : ""}${!on && !can ? " hide" : ""}`}
                  onClick={() => { const next = on ? extra.filter((k) => k !== x.key) : [...extra, x.key]; setExtra(next); run(() => setStaffAccess(s.id, role, next)); }}>
                  {on && !fixed ? "✓ " : !on ? "+ " : ""}{x.label}
                </button>
              );
            })}
          </div>
        )}
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

/** اختيار صلاحيات إضافية عند إنشاء حساب جديد */
export function AccessPicker({ sections, base }: { sections: Sec[]; base: Record<string, string[]> }) {
  const [role, setRole] = useState("sales");
  const [extra, setExtra] = useState<string[]>([]);
  useEffect(() => {
    const sel = document.querySelector<HTMLSelectElement>('select[name="role"]');
    if (!sel) return;
    const on = () => setRole(sel.value);
    on(); sel.addEventListener("change", on);
    return () => sel.removeEventListener("change", on);
  }, []);
  if (role === "owner") return null;
  return (
    <div className="a-field">صلاحيات إضافية
      <div className="stf-chips">
        {sections.map((x) => {
          const fixed = (base[role] ?? []).includes(x.key), on = fixed || extra.includes(x.key);
          return (
            <button key={x.key} type="button" disabled={fixed} className={`stf-chip${on ? " on" : ""}${fixed ? " fixed" : ""}`}
              onClick={() => setExtra(on ? extra.filter((k) => k !== x.key) : [...extra, x.key])}>
              {on && !fixed ? "✓ " : !on ? "+ " : ""}{x.label}
            </button>
          );
        })}
      </div>
      {extra.filter((k) => !(base[role] ?? []).includes(k)).map((k) => <input key={k} type="hidden" name="access" value={k} />)}
    </div>
  );
}
