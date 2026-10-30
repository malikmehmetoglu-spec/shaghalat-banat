"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { invTabActive, invTabsFor } from "@/lib/inventoryNav";

/** شريط تبويبات «إدارة المخزون» أعلى كل صفحاته — يعرض فقط ما يحق للدور فتحه */
export function InventoryTabs({ role }: { role: string }) {
  const path = usePathname();
  const tabs = invTabsFor(role);
  const nav = useRef<HTMLElement>(null);
  // على الهاتف: إظهار التبويب الحالي إن كان خارج الشاشة
  useEffect(() => { nav.current?.querySelector<HTMLElement>(".inv-tab.on")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [path]);
  if (tabs.length < 2) return null;
  return (
    <nav ref={nav} className="inv-tabs no-print" aria-label="إدارة المخزون">
      {tabs.map((t) => {
        const on = invTabActive(path, t);
        return (
          <Link key={t.href} href={t.href} className={`inv-tab${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
            <Icon name={t.icon} size={17} stroke={2} /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
