"use client";
import { signOutSafely } from "@/components/PushToggle";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { getBrowserClient } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";

export function LogoutButton() {
  const t = useT();
  const router = useRouter();
  return (
    <button type="button" className="btn secondary block" style={{ height: 56, color: "var(--danger-fg)" }}
      onClick={async () => { await signOutSafely(); router.replace("/"); router.refresh(); }}>
      <Icon name="logout" size={18} stroke={2} /> {t("تسجيل الخروج")}
    </button>
  );
}
