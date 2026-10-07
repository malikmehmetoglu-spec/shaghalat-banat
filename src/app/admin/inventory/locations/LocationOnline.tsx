"use client";
import { useOptimistic, useTransition } from "react";
import { toggleLocationOnline } from "../../actions";
import { Switch } from "../../Switch";

export function LocationOnline({ id, on }: { id: string; on: boolean }) {
  const [v, setV] = useOptimistic(on);
  const [, start] = useTransition();
  return <Switch on={v} label="متاح أونلاين" onChange={(n) => start(async () => { setV(n); await toggleLocationOnline(id, n); })} />;
}
