"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { getBrowserClient } from "@/lib/supabase/client";

export function AdminLogout() {
  const router = useRouter();
  return (
    <button type="button" className="adm-ni" style={{ border: 0, background: "transparent", width: "100%", cursor: "pointer", font: "inherit" }}
      onClick={async () => { await getBrowserClient().auth.signOut(); router.replace("/admin-login"); router.refresh(); }}>
      <Icon name="logout" stroke={2} /> تسجيل الخروج
    </button>
  );
}
