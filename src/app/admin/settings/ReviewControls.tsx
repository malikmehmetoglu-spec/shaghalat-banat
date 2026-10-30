"use client";
import { useOptimistic, useTransition } from "react";
import { deleteTestimonial, toggleTestimonial } from "../actions";
import { Switch } from "../Switch";
import { Icon } from "@/components/Icon";

export function ReviewControls({ id, visible }: { id: string; visible: boolean }) {
  const [v, setV] = useOptimistic(visible);
  const [pending, start] = useTransition();
  return (
    <div className="row-between" style={{ alignItems: "center" }}>
      <Switch on={v} label="إظهار في المتجر" onChange={(n) => start(async () => { setV(n); const r = await toggleTestimonial(id, n); if (!r.ok) alert(r.message); })} />
      <button type="button" className="icon-btn" aria-label="حذف الرأي" disabled={pending}
        onClick={() => { if (confirm("حذف هذا الرأي نهائياً؟")) start(async () => { const r = await deleteTestimonial(id); if (!r.ok) alert(r.message); }); }}>
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}
