"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

export type Address = { id: string; label: string; city: string; street: string; recipient_phone: string | null; is_default: boolean };

/** نموذج إضافة عنوان — يُستخدم في الدفع وفي صفحة عناويني */
export function AddressForm({ onSaved, onCancel, makeDefault = false }: { onSaved: (a: Address) => void; onCancel?: () => void; makeDefault?: boolean }) {
  const [label, setLabel] = useState("المنزل");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !street.trim()) { setErr("المدينة والشارع مطلوبان"); return; }
    setBusy(true);
    const sb = getBrowserClient();
    const { data: u } = await sb.auth.getUser();
    const { data, error } = await sb.from("addresses")
      .insert({ user_id: u.user!.id, label, city: city.trim(), street: street.trim(), recipient_phone: phone.trim() || null, is_default: makeDefault })
      .select("id,label,city,street,recipient_phone,is_default").single();
    setBusy(false);
    if (error || !data) { setErr("تعذّر حفظ العنوان، حاولي مجدداً"); return; }
    onSaved(data as Address);
  }

  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {["المنزل", "العمل", "أخرى"].map((l) => (
          <button key={l} type="button" className={`chip${label === l ? " on" : ""}`} style={{ flex: 1, justifyContent: "center", height: 44 }} onClick={() => setLabel(l)}>{l}</button>
        ))}
      </div>
      <label className="field">المدينة والمنطقة<input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: دمشق، المزة" /></label>
      <label className="field">الشارع ورقم البناء<input className="input" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="مثال: شارع الجلاء، بناء 12" /></label>
      <label className="field">رقم هاتف المستلمة<input className="input ltr" style={{ textAlign: "right" }} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+963 9XX XXX XXX" /></label>
      {err && <span className="alert tone-danger">{err}</span>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn cta" style={{ flex: 1 }} disabled={busy}>{busy ? "جارٍ الحفظ…" : "حفظ العنوان"}</button>
        {onCancel && <button type="button" className="btn secondary" style={{ height: 56 }} onClick={onCancel}>إلغاء</button>}
      </div>
    </form>
  );
}
