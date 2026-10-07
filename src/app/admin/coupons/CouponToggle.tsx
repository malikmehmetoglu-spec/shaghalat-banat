"use client";
import { useOptimistic, useTransition } from "react";
import { toggleCoupon } from "../actions";
import { Switch } from "../Switch";

export function CouponToggle({ code, active }: { code: string; active: boolean }) {
  const [v, setV] = useOptimistic(active);
  const [, start] = useTransition();
  return <Switch on={v} label={`تفعيل ${code}`} onChange={(n) => start(async () => { setV(n); await toggleCoupon(code, n); })} />;
}
