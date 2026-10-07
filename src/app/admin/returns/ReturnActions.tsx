"use client";
import { useTransition } from "react";
import { setReturnStatus } from "../actions";

export function ReturnActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const btn = (s: string, l: string, cls = "btn soft") => <button key={s} className={cls} style={{ minHeight: 34, padding: "0 12px" }} disabled={pending} onClick={() => start(() => setReturnStatus(id, s))}>{l}</button>;
  if (status === "pending") return <span style={{ display: "flex", gap: 6 }}>{btn("approved", "موافقة", "btn")}{btn("rejected", "رفض")}</span>;
  if (status === "approved") return btn("done", "تم الاستلام");
  return null;
}
