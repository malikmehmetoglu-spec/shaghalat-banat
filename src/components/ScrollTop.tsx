"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** يبدأ كل صفحة جديدة من الأعلى (التصغير على شاشات الكمبيوتر يُربك حساب التمرير التلقائي) */
export function ScrollTop() {
  const path = usePathname();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); }, [path]);
  return null;
}
