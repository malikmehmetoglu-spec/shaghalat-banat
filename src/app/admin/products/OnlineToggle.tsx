"use client";
import { useOptimistic, useTransition } from "react";
import { toggleProductOnline } from "../actions";
import { Switch } from "../Switch";

export function OnlineToggle({ id, value }: { id: string; value: boolean }) {
  const [opt, setOpt] = useOptimistic(value);
  const [, start] = useTransition();
  return <Switch on={opt} label="ظاهر في المتجر الإلكتروني" onChange={(v) => start(async () => { setOpt(v); await toggleProductOnline(id, v); })} />;
}
