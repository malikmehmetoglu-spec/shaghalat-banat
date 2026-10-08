"use client";
import { useEffect, useState } from "react";
import { VariantsEditor } from "./[id]/VariantsEditor";
import { Icon } from "@/components/Icon";

type V = Parameters<typeof VariantsEditor>[0]["variants"][number];

/** زر «تعديل الكمية» في قائمة المنتجات: نافذة فيها الكميات الحالية لكل لون ومقاس مع الإضافة */
export function QtyButton({ productId, name, variants, locations }: { productId: string; name: string; variants: V[]; locations: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button type="button" className="btn soft" style={{ gap: 6 }} onClick={() => setOpen(true)}><Icon name="boxes" size={15} stroke={2} />تعديل الكمية</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`كميات ${name}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(58,42,48,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 760, maxHeight: "90dvh", overflowY: "auto", borderRadius: 28, background: "#fff", boxShadow: "0 30px 80px rgba(58,42,48,.35)" }} className="scr">
            <div className="row-between" style={{ padding: "18px 22px 0" }}>
              <b style={{ fontSize: 18, lineHeight: 1.5 }}>{name}</b>
              <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)}
                style={{ width: 40, height: 40, borderRadius: 20, border: 0, background: "var(--light-blush)", color: "var(--deep-berry)", fontSize: 20, lineHeight: 1, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: 6 }}>
              <VariantsEditor productId={productId} variants={variants} locations={locations} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
