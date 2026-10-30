"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";

type Tab = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; exact?: boolean };

/** شريط تبويبات لقسم في لوحة الإدارة (المخزون، المالية…) */
export function SectionTabs({ tabs, label }: { tabs: readonly Tab[]; label: string }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);
  useEffect(() => { nav.current?.querySelector<HTMLElement>(".inv-tab.on")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [path]);
  if (tabs.length < 2) return null;
  return (
    <nav ref={nav} className="inv-tabs no-print" aria-label={label}>
      {tabs.map((t) => {
        const on = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={`inv-tab${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
            <Icon name={t.icon} size={17} stroke={2} /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
