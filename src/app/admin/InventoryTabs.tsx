"use client";
import { invTabsFor } from "@/lib/inventoryNav";
import { SectionTabs } from "./SectionTabs";

/** شريط تبويبات «إدارة المخزون» — يعرض فقط ما يحق للدور فتحه */
export function InventoryTabs({ role, extra = [] }: { role: string; extra?: string[] }) {
  return <SectionTabs tabs={invTabsFor(role, extra) as any} label="إدارة المخزون" />;
}
