import "./admin.css";
import { AdminSidebar } from "./AdminSidebar";
import { requireStaff, ROLE_LABEL } from "@/lib/admin";

export const metadata = { title: { default: "لوحة الإدارة", template: "%s · إدارة شغلات بنات" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  return (
    <div className="adm">
      <AdminSidebar name={profile.full_name || profile.email || "فريق العمل"} role={ROLE_LABEL[profile.role]} />
      <main className="adm-main">{children}</main>
    </div>
  );
}
