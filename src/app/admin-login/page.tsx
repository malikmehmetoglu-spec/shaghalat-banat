import { AdminLoginForm } from "./AdminLoginForm";

export const metadata = { title: "دخول الإدارة · شغلات بنات" };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AdminLoginForm next={next?.startsWith("/admin") ? next : "/admin"} />;
}
