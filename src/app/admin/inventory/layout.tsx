import { requireStaff } from "@/lib/admin";
import { InventoryTabs } from "../InventoryTabs";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  return <><InventoryTabs role={profile.role} extra={profile.extra_access ?? []} />{children}</>;
}
