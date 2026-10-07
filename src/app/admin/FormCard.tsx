"use client";
import { useActionState } from "react";
import type { ActionResult } from "./actions";

/** بطاقة نموذج عامة مع رسالة نجاح/خطأ — تُستخدم لنماذج الإضافة البسيطة */
export function FormCard({ title, action, submitLabel, children, resetOnSuccess = true }: {
  title: string;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children: React.ReactNode;
  resetOnSuccess?: boolean;
}) {
  const [state, run, pending] = useActionState<ActionResult | null, FormData>(action, null);
  return (
    <form action={run} key={resetOnSuccess && state?.ok ? state.message + Date.now() : "f"} className="acard" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 className="adm-h2">{title}</h2>
      {children}
      {state && <span className={`a-flash ${state.ok ? "tone-success" : "tone-danger"}`}>{state.message}</span>}
      <button type="submit" className="btn" disabled={pending} style={{ alignSelf: "flex-start", minWidth: 140 }}>{pending ? "جارٍ الحفظ…" : submitLabel}</button>
    </form>
  );
}
