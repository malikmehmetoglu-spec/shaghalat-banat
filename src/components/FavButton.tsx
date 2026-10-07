"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { Icon } from "./Icon";

/** زر القلب: يحفظ المنتج في مفضلة العميلة (يتطلب تسجيل الدخول). */
export function FavButton({ productId, initial, className = "fav", size = 16 }: { productId: string; initial: boolean; className?: string; size?: number }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  async function toggle() {
    const sb = getBrowserClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) {
      router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const next = !on;
    setOn(next);
    start(async () => {
      const res = next
        ? await sb.from("favorites").insert({ user_id: data.user!.id, product_id: productId })
        : await sb.from("favorites").delete().eq("user_id", data.user!.id).eq("product_id", productId);
      if (res.error) setOn(!next);
      router.refresh();
    });
  }

  return (
    <button type="button" className={className} onClick={toggle} disabled={pending}
      aria-label={on ? "إزالة من المفضلة" : "أضيفي إلى المفضلة"} aria-pressed={on} style={{ color: "var(--magenta)" }}>
      <Icon name="heart" size={size} stroke={2} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
