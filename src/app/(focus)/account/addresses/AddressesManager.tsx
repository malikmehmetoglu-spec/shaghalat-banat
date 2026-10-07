"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { PageHeaderClient } from "@/components/PageHeaderClient";
import { AddressForm, type Address } from "@/components/AddressForm";
import { getBrowserClient } from "@/lib/supabase/client";

export function AddressesManager({ initial }: { initial: Address[] }) {
  const [list, setList] = useState(initial);
  const [adding, setAdding] = useState(false);

  async function makeDefault(id: string) {
    const sb = getBrowserClient();
    const { data: u } = await sb.auth.getUser();
    await sb.from("addresses").update({ is_default: false }).eq("user_id", u.user!.id);
    await sb.from("addresses").update({ is_default: true }).eq("id", id);
    setList((l) => l.map((a) => ({ ...a, is_default: a.id === id })));
  }
  async function remove(id: string) {
    const { error } = await getBrowserClient().from("addresses").delete().eq("id", id);
    if (!error) setList((l) => l.filter((a) => a.id !== id));
  }

  return (
    <main className="page tight no-nav">
      <PageHeaderClient title="عناويني" back="/account" />
      {list.length === 0 && !adding && <p className="muted" style={{ textAlign: "center", padding: "24px 0" }}>لم تضيفي أي عنوان بعد</p>}
      {list.map((a) => (
        <div key={a.id} style={{ padding: 16, borderRadius: 24, display: "flex", flexDirection: "column", gap: 16, border: `1.5px solid ${a.is_default ? "var(--magenta)" : "var(--light-blush)"}`, background: a.is_default ? "var(--surface-selected)" : "#fff" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span className="icon-tile"><Icon name="pin" /></span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{a.label}</span>
                {a.is_default && <span className="pill" style={{ background: "var(--magenta)", color: "#fff", height: 24, fontSize: 11 }}>الافتراضي</span>}
              </div>
              <span style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-muted)" }}>{a.city}، {a.street}</span>
              {a.recipient_phone && <span className="ltr caption" style={{ textAlign: "right", fontSize: 13 }}>{a.recipient_phone}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {!a.is_default && <button type="button" className="btn secondary" style={{ flex: 1, height: 40, fontSize: 13 }} onClick={() => makeDefault(a.id)}>تعيين كافتراضي</button>}
            <button type="button" aria-label="حذف العنوان" onClick={() => remove(a.id)} style={{ width: 40, height: 40, flexShrink: 0, padding: 0, borderRadius: "50%", border: "none", background: "var(--light-blush)", color: "var(--deep-berry)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: a.is_default ? "auto" : 0 }}>
              <Icon name="trash" size={16} stroke={2} />
            </button>
          </div>
        </div>
      ))}
      {adding && (
        <div className="card" style={{ padding: 20 }}>
          <AddressForm makeDefault={list.length === 0} onSaved={(a) => { setList((l) => [...l, a]); setAdding(false); }} onCancel={() => setAdding(false)} />
        </div>
      )}
      {!adding && (
        <div className="action-bar">
          <button type="button" className="btn cta block" onClick={() => setAdding(true)}><Icon name="plus" size={18} stroke={2.4} /> إضافة عنوان جديد</button>
        </div>
      )}
    </main>
  );
}
