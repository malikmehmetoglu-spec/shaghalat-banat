"use client";
import { invTabsFor } from "@/lib/inventoryNav";
import { SectionTabs } from "./SectionTabs";

/** شريط تبويبات «إدارة المخزون» — يعرض فقط ما يحق للدور فتحه */
export function InventoryTabs({ role }: { role: string }) {
  return <SectionTabs tabs={invTabsFor(role) as any} label="إدارة المخزون" />;
}
