"use client";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";

export function MarkAllRead() {
  const router = useRouter();
  async function run() {
    const sb = getBrowserClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return;
    await sb.from("notifications").update({ is_read: true }).eq("user_id", data.user.id).eq("is_read", false);
    router.refresh();
  }
  return <button type="button" className="link-btn" onClick={run} style={{ width: 72 }}>قراءة الكل</button>;
}
