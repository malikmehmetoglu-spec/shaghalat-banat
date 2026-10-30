"use client";
import { useEffect } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { syncPushOwner } from "./PushToggle";
import { useLang } from "./LangProvider";

/** يضمن أن إشعارات هذا الجهاز تخصّ الحساب المسجّل عليه الآن فقط، ويضمّ طلبات الضيفة إلى حسابها */
export function PushOwnerSync() {
  const lang = useLang();
  useEffect(() => {
    const sb = getBrowserClient();
    let last: string | null | undefined;
    const { data } = sb.auth.onAuthStateChange((event: string, session: { user: { id: string } } | null) => {
      const uid = session?.user.id ?? null;
      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN") return;
      if (!uid || uid === last) return;
      last = uid;
      syncPushOwner(lang);
      // ضمّ طلبات الضيفة السابقة بنفس الرقم (المُتحقَّق منه برمز) — مرة لكل جلسة
      try { if (sessionStorage.getItem("sb-claimed") === uid) return; sessionStorage.setItem("sb-claimed", uid); } catch {}
      sb.rpc("claim_my_orders").then(() => {}, () => {});
    });
    return () => data.subscription.unsubscribe();
  }, [lang]);
  return null;
}
