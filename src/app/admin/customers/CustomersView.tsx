"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { price, date } from "@/lib/format";
import { deleteCustomer } from "../actions";

export type Row = {
  phone: string; name: string | null; marketing_opt_in: boolean; opt_in_at: string | null; first_source: string; created_at: string;
  n: number; spent: number; last_order: string | null; bought_store: boolean; bought_online: boolean;
  orders: { id: string; number: string; total: number; channel: string; created_at: string }[];
};

const WA = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2Z"/></svg>;
const CALL = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>;
const CONTACT = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/></svg>;
const TRASH = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>;

/** يفتح شاشة «إضافة جهة اتصال» على الهاتف مع الاسم والرقم جاهزين */
function saveContact(r: Row) {
  const name = r.name || "عميلة شغلات بنات";
  const tel = `+${r.phone}`;
  if (/android/i.test(navigator.userAgent)) {
    // أندرويد: يفتح نافذة جهة اتصال جديدة مباشرة
    location.href = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;S.name=${encodeURIComponent(name)};S.phone=${encodeURIComponent(tel)};S.phone_type=2;end`;
    return;
  }
  // آيفون والباقي: بطاقة اتصال تُعرض مع زر «إنشاء جهة اتصال جديدة»
  location.href = `/admin/customers/vcard?${new URLSearchParams({ phone: r.phone, name })}`;
}

const tierOf = (n: number) => (n >= 5 ? ["مميّزة", "tone-brand"] : n >= 2 ? ["دائمة", "tone-info"] : ["جديدة", "tone-success"]);

export function CustomersView({ rows, empty }: { rows: Row[]; empty: string }) {
  const router = useRouter();
  const [selPhone, setSelPhone] = useState<string | null>(rows[0]?.phone ?? null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const list = rows.filter((r) => !removed.has(r.phone));
  const sel = list.find((r) => r.phone === selPhone) ?? list[0];

  const del = (r: Row) => start(async () => {
    const res = await deleteCustomer(r.phone);
    if (res.ok) { setRemoved((s) => new Set(s).add(r.phone)); setConfirm(null); router.refresh(); }
  });

  const actions = (r: Row) => (
    <span style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
      <a className="icon-act wa" href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer" title="واتساب" aria-label="واتساب">{WA}</a>
      <a className="icon-act call" href={`tel:+${r.phone}`} title="اتصال" aria-label="اتصال">{CALL}</a>
      <button type="button" className="icon-act contact" onClick={() => saveContact(r)} title="إضافة لجهات الاتصال" aria-label="إضافة لجهات الاتصال">{CONTACT}</button>
      <button type="button" className="icon-act del" onClick={() => setConfirm(r.phone)} title="حذف" aria-label="حذف">{TRASH}</button>
    </span>
  );

  return (
    <div className="split">
      <div className="acard flush wide">
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>العميلة</th><th>الهاتف</th><th>من أين</th><th>الطلبات</th><th>المشتريات</th><th>آخر شراء</th><th>إجراءات</th></tr></thead>
            <tbody>
              {list.map((c) => {
                const tier = tierOf(c.n);
                return (
                  <tr key={c.phone} className={`clickrow${sel?.phone === c.phone ? " sel" : ""}`} onClick={() => setSelPhone(c.phone)}>
                    <td>
                      <b style={{ fontWeight: 600 }}>{c.name || "بدون اسم"}</b>
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        <span className={`pill ${tier[1]}`}>{tier[0]}</span>
                        {c.marketing_opt_in && <span className="pill tone-brand">📣 وافقت</span>}
                      </div>
                    </td>
                    <td className="caption ltr" style={{ textAlign: "right", whiteSpace: "nowrap" }}>+{c.phone}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {c.bought_store && <span className="pill tone-neutral" style={{ marginInlineEnd: 4 }}>المحل</span>}
                      {c.bought_online && <span className="pill tone-info">المتجر</span>}
                      {!c.bought_store && !c.bought_online && <span className="caption">—</span>}
                    </td>
                    <td>{c.n}</td>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{price(c.spent)}</td>
                    <td className="caption" style={{ whiteSpace: "nowrap" }}>{c.last_order ? date(c.last_order) : "—"}</td>
                    <td>{confirm === c.phone ? (
                      <span style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn" style={{ minHeight: 34, padding: "0 12px", background: "#c62828" }} disabled={pending} onClick={() => del(c)}>تأكيد الحذف</button>
                        <button className="btn soft" style={{ minHeight: 34, padding: "0 12px" }} onClick={() => setConfirm(null)}>إلغاء</button>
                      </span>
                    ) : actions(c)}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={7} className="caption" style={{ textAlign: "center", padding: 24 }}>{empty}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {sel && (
        <div className="acard narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 60, height: 60, flexShrink: 0, borderRadius: "50%", background: "var(--magenta)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>{(sel.name || "ع")[0]}</span>
            <div className="title-block" style={{ gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{sel.name || "بدون اسم"}</span>
              <span className="caption ltr" style={{ textAlign: "right" }}>+{sel.phone}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
            <a className="btn" href={`https://wa.me/${sel.phone}`} target="_blank" rel="noreferrer" style={{ background: "#25D366", gap: 6, padding: "0 8px" }}>{WA} واتساب</a>
            <a className="btn secondary" href={`tel:+${sel.phone}`} style={{ gap: 6, padding: "0 8px" }}>{CALL} اتصال</a>
            <button type="button" className="btn secondary" onClick={() => saveContact(sel)} style={{ gap: 6, padding: "0 8px" }}>{CONTACT} حفظ</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
            {[[sel.n, "عملية شراء"], [price(sel.spent), "مجموع المشتريات"]].map(([v, l]) => (
              <div key={String(l)} style={{ padding: "12px 6px", borderRadius: 16, background: "var(--surface-admin)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}><b style={{ fontSize: 15, lineHeight: 1.4 }}>{v}</b><span className="caption">{l}</span></div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="caption">{sel.marketing_opt_in ? `📣 وافقت على قنوات العروض${sel.opt_in_at ? ` · ${date(sel.opt_in_at)}` : ""}` : "لم توافق على قنوات العروض"}</span>
            <span className="caption">أول ظهور: {sel.first_source === "store" ? "المحل" : "المتجر"} · {date(sel.created_at)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>آخر عمليات الشراء</span>
            {sel.orders.map((o) => (
              <Link key={o.id} href={`/admin/orders?id=${o.id}`} className="kv" style={{ color: "inherit" }}>
                <span><span className="ltr">#{o.number}</span> <span className="caption">· {o.channel === "store" ? "المحل" : "المتجر"} · {date(o.created_at)}</span></span>
                <span className="adm-sub">{price(o.total)}</span>
              </Link>
            ))}
            {!sel.orders.length && <span className="caption">لا توجد عمليات شراء</span>}
          </div>
        </div>
      )}
    </div>
  );
}
