"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="sh-nav scr">
      {items.map((it) => {
        const on = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return <Link key={it.href} href={it.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{it.label}</Link>;
      })}
    </nav>
  );
}
