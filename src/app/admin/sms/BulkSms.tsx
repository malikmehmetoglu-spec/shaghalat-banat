"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { price, date } from "@/lib/format";
import { sendBulkSms, startSmsCampaign } from "../shop-orders/actions";

export type Cust = { phone: string; name: string | null; created: string; n: number; spent: number; last: string | null; store: boolean; online: boolean };
export type Camp = { id: string; body: string; filters: string | null; recipients: number; sent: number; failed: number; at: string; by: string };

const DAY = 864e5;
const SRC = [["all", "الكل"], ["store", "اشترت من المحل"], ["online", "اشترت من المتجر"], ["both", "من الاثنين"]] as const;
const ORD = [["all", "أي عدد"], ["0", "لم تشترِ بعد"], ["1", "طلب واحد فأكثر"], ["3", "3 طلبات فأكثر"], ["5", "5 طلبات فأكثر (وفيّات)"]] as const;
const LAST = [["all", "أي وقت"], ["in30", "اشترت خلال 30 يوماً"], ["in90", "اشترت خلال 90 يوماً"], ["out60", "غائبة منذ 60 يوماً+"], ["out180", "غائبة منذ 6 أشهر+"]] as const;
const JOIN = [["all", "أي وقت"], ["7", "آخر 7 أيام"], ["30", "آخر 30 يوماً"], ["90", "آخر 3 أشهر"]] as const;
const SPENT = [["0", "أي مبلغ"], ["250000", "250,000+"], ["500000", "500,000+"], ["1000000", "1,000,000+"], ["2500000", "2,500,000+"]] as const;
const TEMPLATES = [
  "مرحباً {الاسم} 🌸 وصلت تشكيلة جديدة إلى شغلات بنات، بانتظارك!",
  "{الاسم} اشتقنا لك 💗 خصم خاص لك هذا الأسبوع في شغلات بنات",
  "شكراً {الاسم} لأنك من زبونات شغلات بنات المميزات 🌷",
];

function Chips<T extends string>({ label, opts, v, set }: { label: string; opts: readonly (readonly [T, string])[]; v: T; set: (x: T) => void }) {
  return (
    <div className="bs-f">
      <span className="bs-fl">{label}</span>
      <div className="bs-chips">{opts.map(([k, t]) => <button key={k} type="button" className={`bs-chip${v === k ? " on" : ""}`} onClick={() => set(k)}>{t}</button>)}</div>
    </div>
  );
}

export function BulkSms({ rows, noConsent, history, ready }: { rows: Cust[]; noConsent: number; history: Camp[]; ready: boolean }) {
  const router = useRouter();
  const [src, setSrc] = useState<(typeof SRC)[number][0]>("all");
  const [ord, setOrd] = useState<(typeof ORD)[number][0]>("all");
  const [last, setLast] = useState<(typeof LAST)[number][0]>("all");
  const [join, setJoin] = useState<(typeof JOIN)[number][0]>("all");
  const [spent, setSpent] = useState<(typeof SPENT)[number][0]>("0");
  const [q, setQ] = useState("");
  const [off, setOff] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [prog, setProg] = useState<{ done: number; total: number; sent: number; failed: number; msg?: string; end?: boolean } | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const list = useMemo(() => {
    const now = Date.now(), s = q.trim();
    return rows.filter((c) => {
      if (src === "store" && !c.store) return false;
      if (src === "online" && !c.online) return false;
      if (src === "both" && !(c.store && c.online)) return false;
      if (ord === "0" ? c.n !== 0 : ord !== "all" && c.n < Number(ord)) return false;
      const l = c.last ? now - new Date(c.last).getTime() : Infinity;
      if (last === "in30" && l > 30 * DAY) return false;
      if (last === "in90" && l > 90 * DAY) return false;
      if (last === "out60" && (l < 60 * DAY || !c.last)) return false;
      if (last === "out180" && (l < 180 * DAY || !c.last)) return false;
      if (join !== "all" && now - new Date(c.created).getTime() > Number(join) * DAY) return false;
      if (c.spent < Number(spent)) return false;
      if (s && !(c.name ?? "").includes(s) && !c.phone.includes(s.replace(/^0/, ""))) return false;
      return true;
    }).sort((a, b) => b.spent - a.spent);
  }, [rows, src, ord, last, join, spent, q]);
  const picked = list.filter((c) => !off.has(c.phone));
  const allOn = picked.length === list.length;

  const uni = /[^\u0000-\u007f]/.test(text);
  const sample = text.replace(/\{الاسم\}/g, "ريم");
  const per = uni ? (sample.length > 70 ? 67 : 70) : (sample.length > 160 ? 153 : 160);
  const parts = Math.max(1, Math.ceil(sample.length / per));
  const label = (opts: readonly (readonly [string, string])[], v: string) => opts.find(([k]) => k === v)?.[1];
  const summary = [src !== "all" && label(SRC, src), ord !== "all" && label(ORD, ord), last !== "all" && label(LAST, last), join !== "all" && `انضمت ${label(JOIN, join)}`, spent !== "0" && `إنفاق ${label(SPENT, spent)}`].filter(Boolean).join(" · ") || "كل الموافقات على التسويق";
  const busy = !!prog && !prog.end;

  function insertName() {
    const el = ta.current; if (!el) return;
    const a = el.selectionStart ?? text.length, b = el.selectionEnd ?? text.length;
    const t = text.slice(0, a) + "{الاسم}" + text.slice(b);
    setText(t); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + 7, a + 7); });
  }
  async function send() {
    setConfirm(false);
    const phones = picked.map((c) => c.phone);
    const st = await startSmsCampaign(text, phones.length, summary);
    if (!st.ok || !st.id) { setProg({ done: 0, total: phones.length, sent: 0, failed: 0, msg: st.message, end: true }); return; }
    let sent = 0, failed = 0;
    setProg({ done: 0, total: phones.length, sent, failed });
    for (let i = 0; i < phones.length; i += 25) {
      const r = await sendBulkSms(st.id, phones.slice(i, i + 25), text).catch(() => ({ ok: false, message: "انقطع الاتصال", sent: 0, failed: 25 }));
      sent += r.sent; failed += r.failed;
      if (!r.ok) { setProg({ done: i + 25, total: phones.length, sent, failed, msg: r.message, end: true }); router.refresh(); return; }
      setProg({ done: Math.min(i + 25, phones.length), total: phones.length, sent, failed });
    }
    setProg({ done: phones.length, total: phones.length, sent, failed, end: true });
    router.refresh();
  }

  return (
    <div className="bs">
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">رسالة جماعية SMS</h1><span className="adm-sub">اختاري الشريحة بالفلاتر، اكتبي الرسالة، وأرسليها لهن جميعاً من خط المركز</span></div></div>
      {!ready && <div className="a-flash tone-danger">خدمة SMS غير مربوطة بعد — أضيفي SMS_GATE_USER و SMS_GATE_PASS في إعدادات Vercel.</div>}

      <div className="bs-grid">
        <section className="acard bs-filters">
          <h2 className="adm-h2">من تصلها الرسالة؟</h2>
          <Chips label="مصدر الشراء" opts={SRC} v={src} set={(x) => { setSrc(x); setOff(new Set()); }} />
          <Chips label="عدد الطلبات" opts={ORD} v={ord} set={(x) => { setOrd(x); setOff(new Set()); }} />
          <Chips label="آخر شراء" opts={LAST} v={last} set={(x) => { setLast(x); setOff(new Set()); }} />
          <Chips label="مجموع المشتريات (ل.س)" opts={SPENT} v={spent} set={(x) => { setSpent(x); setOff(new Set()); }} />
          <Chips label="تاريخ الانضمام" opts={JOIN} v={join} set={(x) => { setJoin(x); setOff(new Set()); }} />
          <p className="caption">تظهر هنا فقط العميلات اللواتي وافقن على الرسائل التسويقية ({rows.length}). {noConsent > 0 && `${noConsent} عميلة لم توافق ولن تصلهن.`}</p>
        </section>

        <section className="acard bs-people">
          <div className="bs-ph">
            <div className="bs-count"><b className="tabular">{picked.length}</b><span>عميلة مختارة</span></div>
            <button type="button" className="btn soft" onClick={() => setOff(allOn ? new Set(list.map((c) => c.phone)) : new Set())} disabled={!list.length}>{allOn ? "إلغاء تحديد الكل" : "تحديد الكل"}</button>
          </div>
          <input className="a-in" placeholder="بحث بالاسم أو الرقم" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="bs-list">
            {list.map((c) => {
              const on = !off.has(c.phone);
              return (
                <label key={c.phone} className={`bs-row${on ? " on" : ""}`}>
                  <input type="checkbox" checked={on} onChange={() => setOff((s) => { const n = new Set(s); on ? n.add(c.phone) : n.delete(c.phone); return n; })} />
                  <span className="bs-av">{(c.name || "؟").trim()[0]}</span>
                  <span className="bs-who"><b>{c.name || "عميلة"}</b><span className="ltr">+{c.phone}</span></span>
                  <span className="bs-stat"><b>{price(c.spent)}</b><span>{c.n} {c.n === 1 ? "طلب" : "طلبات"}</span></span>
                </label>
              );
            })}
            {!list.length && <div className="ob-empty">لا توجد عميلات بهذه الفلاتر</div>}
          </div>
        </section>

        <section className="acard bs-compose">
          <h2 className="adm-h2">نص الرسالة</h2>
          <div className="bs-tpl">{TEMPLATES.map((t) => <button key={t} type="button" className="bs-chip" onClick={() => setText(t)}>{t.slice(0, 28)}…</button>)}</div>
          <textarea ref={ta} className="a-in sms-ta" dir="auto" rows={6} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتبي رسالتك… استخدمي {الاسم} ليُستبدل باسم كل عميلة" />
          <div className="sms-meta">
            <button type="button" className="bs-chip" onClick={insertName}>+ إدراج اسم العميلة</button>
            <span className="ltr">{sample.length} / {parts * per} · {parts === 1 ? "1 رسالة" : `${parts} رسائل`}</span>
          </div>
          {text.trim() && <div className="bs-preview"><span>معاينة</span><p dir="auto">{sample}</p></div>}
          <div className="bs-total">
            <span>{picked.length} عميلة × {parts} = <b className="tabular">{picked.length * parts}</b> رسالة على الخط</span>
          </div>
          {prog && (
            <div className="bs-prog">
              <div className="bs-bar"><i style={{ width: `${prog.total ? Math.round((Math.min(prog.done, prog.total) / prog.total) * 100) : 0}%` }} /></div>
              <span>{prog.end ? (prog.msg ? prog.msg : "اكتمل الإرسال ✓") : "جارٍ الإرسال… لا تغلقي الصفحة"} · أُرسلت {prog.sent}{prog.failed ? ` · تعذّرت ${prog.failed}` : ""} من {prog.total}</span>
            </div>
          )}
          {confirm ? (
            <div className="bs-confirm">
              <span>إرسال الرسالة إلى <b>{picked.length}</b> عميلة الآن؟</span>
              <div className="sms-acts"><button type="button" className="btn" onClick={send}>نعم، أرسلي</button><button type="button" className="btn soft" onClick={() => setConfirm(false)}>تراجع</button></div>
            </div>
          ) : (
            <button type="button" className="btn bs-send" disabled={!ready || busy || !text.trim() || !picked.length} onClick={() => setConfirm(true)}>
              {busy ? "جارٍ الإرسال…" : `إرسال إلى ${picked.length} عميلة`}
            </button>
          )}
          <span className="caption">نصيحة لتجاوز فلاتر MTN وسيرياتيل: رسالة قصيرة، بلا روابط، وباسم العميلة. وتجنّبي الإرسال لأكثر من بضع مئات في اليوم من خط واحد.</span>
        </section>
      </div>

      {history.length > 0 && (
        <section className="acard flush">
          <h2 className="adm-h2" style={{ padding: "14px 16px 4px" }}>الرسائل السابقة</h2>
          <div className="tw"><table className="tbl">
            <thead><tr><th>التاريخ</th><th>الرسالة</th><th>الشريحة</th><th>أُرسلت</th><th>بواسطة</th></tr></thead>
            <tbody>{history.map((h) => (
              <tr key={h.id}>
                <td className="caption" style={{ whiteSpace: "nowrap" }}>{date(h.at, true)}</td>
                <td style={{ maxWidth: 360 }} dir="auto">{h.body}</td>
                <td className="caption">{h.filters}</td>
                <td style={{ whiteSpace: "nowrap" }}><b className="tabular">{h.sent}</b> / {h.recipients}{h.failed ? <span className="caption" style={{ color: "var(--danger-fg)" }}> · تعذّر {h.failed}</span> : null}</td>
                <td className="caption">{h.by}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}
