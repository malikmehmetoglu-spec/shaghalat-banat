"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { getBrowserClient } from "@/lib/supabase/client";

export function AdminLogout({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const out = async () => { await getBrowserClient().auth.signOut(); router.replace("/admin-login"); router.refresh(); };
  if (compact) return <button type="button" className="adm-me-btn" aria-label="تسجيل الخروج" title="تسجيل الخروج" onClick={out}><Icon name="logout" size={18} stroke={2} /></button>;
  return (
    <button type="button" className="adm-ni" style={{ border: 0, background: "transparent", width: "100%", cursor: "pointer", font: "inherit" }}
      onClick={async () => { await getBrowserClient().auth.signOut(); router.replace("/admin-login"); router.refresh(); }}>
      <Icon name="logout" stroke={2} /> تسجيل الخروج
    </button>
  );
}
