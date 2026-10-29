"use client";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";

/** زر «عرض المزيد»: يحمّل الدفعة التالية ويُبقي الزبونة في مكانها من الصفحة */
export function MoreLink({ href, shown, total, label }: { href: string; shown: number; total: number; label: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const y = useRef<number | null>(null);
  useEffect(() => { if (y.current !== null) { window.scrollTo({ top: y.current }); y.current = null; } }, [shown]);
  if (shown >= total) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
      <button type="button" className="btn secondary" style={{ minWidth: 220 }} disabled={pending}
        onClick={() => { y.current = window.scrollY; start(() => router.replace(href, { scroll: false })); }}>
        {pending ? t("جارٍ التحميل…") : label}
      </button>
    </div>
  );
}
