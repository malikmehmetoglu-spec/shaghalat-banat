"use client";
import { useTransition } from "react";
import { deleteSampleReviews } from "../actions";

export function ClearSamples({ count }: { count: number }) {
  const [pending, start] = useTransition();
  if (!count) return null;
  return (
    <button type="button" className="btn soft" style={{ color: "#c62828" }} disabled={pending}
      onClick={() => { if (confirm(`حذف ${count} آراء تجريبية؟`)) start(async () => { const r = await deleteSampleReviews(); if (!r.ok) alert(r.message); }); }}>
      {pending ? "جارٍ الحذف…" : `حذف الآراء التجريبية (${count})`}
    </button>
  );
}
