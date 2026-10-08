"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveProduct } from "../actions";

export function DeleteProduct({ id, name, redirectTo }: { id: string; name: string; redirectTo?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" className="btn soft" disabled={pending} style={{ color: "var(--danger-fg)" }}
      onClick={() => {
        if (!confirm(`حذف «${name}»؟\nسيختفي من المتجر واللوحة والمخزون. الطلبات السابقة تبقى محفوظة.`)) return;
        start(async () => { const r = await archiveProduct(id); if (!r.ok) alert(r.message); else if (redirectTo) router.replace(redirectTo); else router.refresh(); });
      }}>{pending ? "…" : "حذف"}</button>
  );
}
