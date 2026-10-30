"use client";
import { useEffect } from "react";

/** نافذة جانبية/سفلية لتسجيل حركة */
export function Sheet({ title, sub, tone = "brand", onClose, children }: { title: string; sub?: string; tone?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="fin-sheet-bg" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`fin-sheet fin-t-${tone}`}>
        <header className="fin-sheet-head">
          <div className="fin-sheet-title"><h2>{title}</h2>{sub && <span>{sub}</span>}</div>
          <button type="button" className="fin-x" aria-label="إغلاق" onClick={onClose}>✕</button>
        </header>
        <div className="fin-sheet-body">{children}</div>
      </div>
    </div>
  );
}
