"use client";
import { useRouter } from "next/navigation";

/** سطر جدول قابل للنقر بالكامل (وبلوحة المفاتيح)، مع بقاء الروابط والأزرار بداخله تعمل كالمعتاد */
export function ClickRow({ href, className = "", children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const go = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("a,button,input,select,textarea")) return;
    if ("metaKey" in e && (e.metaKey || e.ctrlKey)) { window.open(href, "_blank"); return; }
    router.push(href, { scroll: false });
  };
  return (
    <tr className={`clickrow ${className}`} tabIndex={0} onClick={go} onKeyDown={(e) => { if (e.key === "Enter") go(e); }}
      onMouseEnter={() => router.prefetch(href)}>
      {children}
    </tr>
  );
}
