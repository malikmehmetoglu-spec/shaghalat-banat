"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSale } from "../actions";

const WAIT = 5;

export function DeleteSale({ id, number, back }: { id: string; number: string; back: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(WAIT);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLeft(WAIT); setErr("");
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [open]);

  const go = () => start(async () => {
    const r = await deleteSale(id);
    if (!r.ok) { setErr(r.message); return; }
    setOpen(false); router.replace(back); router.refresh();
  });

  return (
    <>
      <button type="button" className="btn soft" onClick={() => setOpen(true)} style={{ color: "#c62828" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg> حذف العملية
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby={`ds-${id}`} onClick={(e) => e.target === e.currentTarget && !pending && setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(30,0,18,.45)", display: "grid", placeItems: "center", padding: 16 }}>
          <div className="acard" style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
            <span style={{ width: 56, height: 56, margin: "0 auto", borderRadius: "50%", background: "rgba(198,40,40,.1)", color: "#c62828", display: "grid", placeItems: "center", fontSize: 26 }}>!</span>
            <h2 id={`ds-${id}`} className="adm-h2">حذف العملية <span className="ltr">#{number}</span>؟</h2>
            <span className="caption" style={{ lineHeight: 1.8, textAlign: "start" }}>
              • تعود كل القطع إلى المخزون.<br />
              • تُحذف العملية من المبيعات والأرباح والصندوق نهائياً.<br />
              • لا يمكن التراجع عن الحذف.
            </span>
            {err && <span className="a-flash tone-danger">{err}</span>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button type="button" className="btn soft" onClick={() => setOpen(false)} disabled={pending}>إلغاء</button>
              <button type="button" className="btn" onClick={go} disabled={left > 0 || pending}
                style={{ background: left > 0 ? "#d9a3a3" : "#c62828", position: "relative", overflow: "hidden" }}>
                {left > 0 && <span aria-hidden style={{ position: "absolute", insetBlock: 0, insetInlineStart: 0, width: `${(left / WAIT) * 100}%`, background: "rgba(255,255,255,.25)", transition: "width 1s linear" }} />}
                <span style={{ position: "relative" }}>{pending ? "جارٍ الحذف…" : left > 0 ? `نعم، احذف (${left})` : "نعم، احذف"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
