"use client";
import { useEffect, useState } from "react";

/** ثوانٍ متبقية حتى منتصف الليل بتوقيت دمشق */
function left() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Damascus", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const g = (k: string) => Number(parts.find((p) => p.type === k)?.value ?? 0);
  return 86400 - (g("hour") * 3600 + g("minute") * 60 + g("second"));
}
const pad = (n: number) => String(n).padStart(2, "0");

/** عدّاد ينتهي مع نهاية اليوم — يتجدّد كل يوم */
export function DealCountdown({ label, endsAt }: { label: string; endsAt?: number | null }) {
  const [s, setS] = useState<number | null>(null);
  useEffect(() => {
    const f = () => (endsAt ? Math.max(0, Math.floor((endsAt - Date.now()) / 1000)) : left());
    setS(f()); const id = setInterval(() => setS(f()), 1000); return () => clearInterval(id);
  }, [endsAt]);
  if (s === null) return null;
  const d = Math.floor(s / 86400);
  return (
    <span className="deal-timer" role="timer" aria-label={label}>
      <span className="deal-timer-lbl">{label}</span>
      <span className="ltr deal-timer-v">{d > 0 ? `${pad(d)}:` : ""}{pad(Math.floor((s % 86400) / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}</span>
    </span>
  );
}
