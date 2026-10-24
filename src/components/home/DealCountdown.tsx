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
export function DealCountdown({ label }: { label: string }) {
  const [s, setS] = useState<number | null>(null);
  useEffect(() => { setS(left()); const id = setInterval(() => setS(left()), 1000); return () => clearInterval(id); }, []);
  if (s === null) return null;
  return (
    <span className="deal-timer" role="timer" aria-label={label}>
      <span className="deal-timer-lbl">{label}</span>
      <span className="ltr deal-timer-v">{pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}</span>
    </span>
  );
}
