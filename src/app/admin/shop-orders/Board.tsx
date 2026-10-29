"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus } from "../actions";
import { sendOrderSms } from "./actions";
import { price, PAYMENT_LABEL } from "@/lib/format";
import { orderNo, smsText, waLink, whatsappText, type Stage } from "@/lib/orderMessages";
import { Icon } from "@/components/Icon";

export type BoardOrder = {
  id: string; number: string; status: Stage; payment: string; paid: boolean; total: number; shipping: number; discount: number;
  createdAt: string; note: string | null; name: string; city: string; street: string; phone: string | null;
  items: { name: string; label: string | null; qty: number; price: number }[];
};

const COLS: { key: Stage; title: string; hint: string; next?: { to: Stage; label: string } }[] = [
  { key: "new", title: "بانتظار التأكيد", hint: "تأكّد من وصول الدفع", next: { to: "preparing", label: "تم الدفع، ابدأ التجهيز" } },
  { key: "preparing", title: "قيد التجهيز", hint: "جهّز الطلب وسلّمه للشحن", next: { to: "shipped", label: "سُلِّم لشركة الشحن" } },
  { key: "shipped", title: "قيد الشحن", hint: "بانتظار إشعار التسليم", next: { to: "delivered", label: "تم التسليم" } },
  { key: "delivered", title: "تم التسليم", hint: "آخر 14 يوماً" },
];
const ORDER: Stage[] = ["new", "preparing", "shipped", "delivered"];

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.round(h / 24);
  return d === 1 ? "منذ يوم" : `منذ ${d} أيام`;
}

export function Board({ orders: initial, agent }: { orders: BoardOrder[]; agent: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initial);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Stage>("new");
  const [open, setOpen] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [sms, setSms] = useState<Record<string, "sending" | "sent" | "fail">>({});
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [, start] = useTransition();
  const known = useRef(new Set(initial.map((o) => o.id)));
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  // تحديث من الخادم: طلبات جديدة وتغييرات من أجهزة أخرى
  useEffect(() => {
    setOrders(initial);
    const added = initial.filter((o) => !known.current.has(o.id)).map((o) => o.id);
    initial.forEach((o) => known.current.add(o.id));
    if (added.length) setFresh((f) => new Set([...f, ...added]));
  }, [initial]);
  useEffect(() => { const id = setInterval(() => router.refresh(), 45000); return () => clearInterval(id); }, [router]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 3500); return () => clearTimeout(id); }, [toast]);

  const shown = useMemo(() => {
    const s = q.trim().replace(/^#/, "");
    if (!s) return orders;
    return orders.filter((o) => o.number.includes(s) || o.name.includes(s) || (o.phone ?? "").includes(s.replace(/^0/, "")));
  }, [orders, q]);
  const byCol = (k: Stage) => shown.filter((o) => o.status === k);

  function move(o: BoardOrder, to: Stage) {
    if (o.status === to || busy.has(o.id)) return;
    if (ORDER.indexOf(to) < ORDER.indexOf(o.status) && !confirm(`إرجاع الطلب ${orderNo(o.number)} إلى «${COLS.find((c) => c.key === to)!.title}»؟`)) return;
    const prev = o.status;
    setOrders((l) => l.map((x) => (x.id === o.id ? { ...x, status: to, paid: x.paid || to !== "new" } : x)));
    setBusy((b) => new Set(b).add(o.id));
    setFresh((f) => { const n = new Set(f); n.delete(o.id); return n; });
    start(async () => {
      const r = await setOrderStatus(o.id, to);
      setBusy((b) => { const n = new Set(b); n.delete(o.id); return n; });
      if (!r.ok) { setOrders((l) => l.map((x) => (x.id === o.id ? { ...x, status: prev } : x))); setToast(r); return; }
      setToast({ ok: true, message: `الطلب ${orderNo(o.number)} ← ${COLS.find((c) => c.key === to)!.title}` });
      setSms((m) => { const n = { ...m }; delete n[o.id]; return n; });
    });
  }
  function cancel(o: BoardOrder) {
    if (!confirm(`إلغاء الطلب ${orderNo(o.number)} نهائياً؟ تعود القطع المحجوزة للمخزون.`)) return;
    setBusy((b) => new Set(b).add(o.id));
    start(async () => {
      const r = await setOrderStatus(o.id, "cancelled");
      setBusy((b) => { const n = new Set(b); n.delete(o.id); return n; });
      if (r.ok) setOrders((l) => l.filter((x) => x.id !== o.id));
      setToast(r.ok ? { ok: true, message: `أُلغي الطلب ${orderNo(o.number)}` } : r);
    });
  }
  function sendSms(o: BoardOrder) {
    setSms((m) => ({ ...m, [o.id]: "sending" }));
    start(async () => {
      const r = await sendOrderSms(o.id, o.status);
      setSms((m) => ({ ...m, [o.id]: r.ok ? "sent" : "fail" }));
      setToast(r);
    });
  }

  return (
    <div className="ob">
      <header className="ob-head">
        <div className="title-block">
          <h1 className="adm-h1">طلبات المتجر</h1>
          <span className="adm-sub">اسحب البطاقة إلى العمود التالي، أو اضغط زر الخطوة التالية · تتحدّث تلقائياً</span>
        </div>
        <label className="ob-search">
          <Icon name="search" size={18} />
          <span className="sr">بحث</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="رقم الطلب أو الاسم أو الهاتف" />
        </label>
      </header>

      <nav className="ob-tabs" aria-label="الأعمدة">
        {COLS.map((c) => (
          <button key={c.key} type="button" className={`ob-tab ob-c-${c.key}${tab === c.key ? " on" : ""}`}
            onClick={() => { setTab(c.key); document.getElementById(`col-${c.key}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" }); }}>
            {c.title}<span className="ob-n">{byCol(c.key).length}</span>
          </button>
        ))}
      </nav>

      <div className="ob-cols">
        {COLS.map((c) => {
          const list = byCol(c.key);
          return (
            <section key={c.key} id={`col-${c.key}`} className={`ob-col ob-c-${c.key}${over === c.key ? " over" : ""}`}
              onDragOver={(e) => { if (drag) { e.preventDefault(); setOver(c.key); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); setOver(null); const o = orders.find((x) => x.id === drag); if (o) move(o, c.key); setDrag(null); }}>
              <div className="ob-col-head">
                <span className="ob-dot" aria-hidden="true" />
                <h2>{c.title}</h2>
                <span className="ob-n">{list.length}</span>
              </div>
              <span className="ob-hint">{c.hint}</span>
              <div className="ob-list">
                {list.map((o) => {
                  const isOpen = open === o.id;
                  const count = o.items.reduce((s, i) => s + i.qty, 0);
                  const st = sms[o.id];
                  return (
                    <article key={o.id} className={`ob-card${fresh.has(o.id) ? " fresh" : ""}${busy.has(o.id) ? " busy" : ""}${drag === o.id ? " dragging" : ""}`}
                      draggable onDragStart={(e) => { setDrag(o.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDrag(null); setOver(null); }}>
                      <button type="button" className="ob-card-main" onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen}>
                        <div className="ob-row">
                          <b className="ob-num ltr">#{orderNo(o.number)}</b>
                          <span className={`ob-pay ob-pay-${o.payment}`}>{PAYMENT_LABEL[o.payment] ?? o.payment}</span>
                          <span className="ob-time">{ago(o.createdAt)}</span>
                        </div>
                        <div className="ob-row">
                          <span className="ob-name">{o.name}</span>
                          <b className="ob-total">{price(o.total)}</b>
                        </div>
                        <div className="ob-row ob-sub">
                          <span>{o.city || "—"} · {count} {count === 1 ? "قطعة" : "قطع"}</span>
                          <span className="ob-more">{isOpen ? "إخفاء" : "التفاصيل"} {isOpen ? "▴" : "▾"}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="ob-details">
                          {o.items.map((it, k) => (
                            <div key={k} className="ob-item"><span>{it.name}{it.label ? ` · ${it.label}` : ""} <b className="ltr">×{it.qty}</b></span><span>{price(it.price * it.qty)}</span></div>
                          ))}
                          <div className="ob-item ob-muted"><span>الشحن</span><span>{o.shipping ? price(o.shipping) : "مجاني"}</span></div>
                          {o.discount > 0 && <div className="ob-item ob-muted"><span>الخصم</span><span>−{price(o.discount)}</span></div>}
                          <div className="ob-addr"><Icon name="pin" size={16} /> {o.city}{o.street ? `، ${o.street}` : ""}</div>
                          {o.phone && <a className="ob-addr ltr" href={`tel:+${o.phone}`}>+{o.phone}</a>}
                          {o.note && <div className="ob-addr">📝 {o.note}</div>}
                          {(c.key === "new" || c.key === "preparing") && <button type="button" className="ob-cancel" onClick={() => cancel(o)}>إلغاء الطلب</button>}
                        </div>
                      )}

                      <div className="ob-actions">
                        {o.phone ? (
                          <a className="ob-btn ob-wa" href={waLink(o.phone, whatsappText(c.key, o, agent))} target="_blank" rel="noreferrer" title={whatsappText(c.key, o, agent)} aria-label="رسالة واتساب">
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z"/></svg>
                            واتساب
                          </a>
                        ) : <span className="ob-btn ob-disabled">بلا رقم</span>}
                        {o.phone && (
                          <button type="button" className={`ob-btn ob-sms${st ? ` ${st}` : ""}`} disabled={st === "sending"} title={smsText(c.key, o)} onClick={() => sendSms(o)} aria-label="إرسال SMS">
                            <Icon name="chat" size={16} />
                            {st === "sending" ? "يُرسل…" : st === "sent" ? "أُرسلت ✓" : "SMS"}
                          </button>
                        )}
                        {c.next && (
                          <button type="button" className="ob-btn ob-next" disabled={busy.has(o.id)} onClick={() => move(o, c.next!.to)}>
                            {c.next.label} <Icon name="forward" size={16} stroke={2.2} />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!list.length && <div className="ob-empty">{c.key === "new" ? "لا طلبات جديدة حالياً" : "لا يوجد"}</div>}
              </div>
            </section>
          );
        })}
      </div>

      {toast && <div className={`ob-toast ${toast.ok ? "ok" : "bad"}`} role="status">{toast.message}</div>}
    </div>
  );
}
