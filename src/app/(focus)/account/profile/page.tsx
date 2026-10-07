import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "تعديل الملف الشخصي" };

export default async function ProfilePage() {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const { data } = await sb.from("profiles").select("full_name,phone,email,birth_date,usual_size").eq("id", u.user!.id).maybeSingle();
  return <ProfileForm initial={data ?? { full_name: "", phone: u.user?.phone ?? "", email: u.user?.email ?? "", birth_date: null, usual_size: null }} />;
}
