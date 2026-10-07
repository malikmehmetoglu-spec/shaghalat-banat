"use client";
import { useOptimistic, useTransition } from "react";
import { deleteBanner, toggleBanner, toggleCategory } from "../actions";
import { Switch } from "../Switch";

export function CategoryToggle({ id, visible }: { id: string; visible: boolean }) {
  const [v, setV] = useOptimistic(visible);
  const [, start] = useTransition();
  return <Switch on={v} label="إظهار القسم" onChange={(n) => start(async () => { setV(n); await toggleCategory(id, n); })} />;
}

export function BannerControls({ id, active }: { id: string; active: boolean }) {
  const [v, setV] = useOptimistic(active);
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Switch on={v} label="تفعيل البانر" onChange={(n) => start(async () => { setV(n); await toggleBanner(id, n); })} />
      <button type="button" className="btn soft" disabled={pending} onClick={() => confirm("حذف هذا البانر؟") && start(() => deleteBanner(id))}>حذف</button>
    </div>
  );
}
