"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reverseInvoice } from "../actions";
import { price } from "@/lib/format";

/** زر «تراجع عن الفاتورة»: نافذة تأكيد تشرح ما سيحدث بالضبط، مع سبب اختياري */
export function ReverseInvoice({ id, number, total, store, shipped }: { id: string; number: string; total: number; store: boolean; shipped: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const goodsOut = store || shipped;
  return (
    <>
      <button type="button" className="btn soft" style={{ flex: 1, color: "#c62828" }} onClick={() => { setOpen(true); setErr(""); }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>
        تراجع عن الفاتورة
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby={`rv-${id}`} onClick={(e) => e.target === e.currentTarget && !pending && setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(30,0,18,.45)", display: "grid", placeItems: "center", padding: 16 }}>
          <div className="acard" style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 id={`rv-${id}`} className="adm-h2">التراجع عن الفاتورة <span className="ltr">#{number}</span>؟</h2>
            <ul className="caption" style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.9 }}>
              <li>{goodsOut ? "تعود كل القطع إلى المستودع/المحل الذي خرجت منه." : "يُفك حجز القطع فتعود متاحة للبيع."}</li>
              {goodsOut && <li>يُسجَّل مبلغ {price(total)} مُعاداً {store ? "من الصندوق" : "للعميلة"}، ويُعكس قيد البيع في الحسابات.</li>}
              <li>تبقى الفاتورة في السجل بحالة «{goodsOut ? "مسترجعة" : "ملغاة"}»، ولا يمكن التراجع عن هذا الإجراء.</li>
            </ul>
            <label className="a-field">السبب (اختياري)<input className="a-in" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="الزبونة أعادت القطعة" /></label>
            {err && <span className="a-flash tone-danger">{err}</span>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn" style={{ flex: 1, background: "#c62828" }} disabled={pending}
                onClick={() => start(async () => { const r = await reverseInvoice(id, reason); if (!r.ok) { setErr(r.message); return; } setOpen(false); router.refresh(); })}>
                {pending ? "جارٍ التراجع…" : "نعم، تراجع"}
              </button>
              <button type="button" className="btn secondary" style={{ flex: 1 }} disabled={pending} onClick={() => setOpen(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
