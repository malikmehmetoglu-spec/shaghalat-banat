"use client";
import { useState, useTransition } from "react";
import { setOrderStatus } from "../actions";
import { ORDER_STATUS } from "@/lib/format";

const NEXT: Record<string, string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function StatusButtons({ orderId, current }: { orderId: string; current: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [note, setNote] = useState("");
  const options = NEXT[current] ?? [];
  if (!options.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>تغيير الحالة</span>
      <input className="a-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة للعميلة (اختياري)" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((s) => (
          <button key={s} type="button" disabled={pending}
            className={s === "cancelled" || s === "returned" ? "btn secondary" : "btn"}
            style={{ height: 40, fontSize: 13, color: s === "cancelled" ? "var(--danger-fg)" : undefined }}
            onClick={() => {
              if ((s === "cancelled" || s === "returned") && !confirm(`تأكيد: ${ORDER_STATUS[s].label}؟`)) return;
              start(async () => setMsg(await setOrderStatus(orderId, s, note)));
            }}>
            {ORDER_STATUS[s].label}
          </button>
        ))}
      </div>
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
      <span className="caption">عند «قيد الشحن» تُخصم الكمية من المخزون، وعند «ملغى» يُفك حجزها. تصل العميلة إشعاراً بكل تغيير.</span>
    </div>
  );
}
