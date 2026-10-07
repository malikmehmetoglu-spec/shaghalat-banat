"use client";
import Link from "next/link";
import { Icon } from "./Icon";
import { useCart } from "./CartProvider";
import { useT } from "@/components/LangProvider";

/** زر السلة الدائري مع عدّاد القطع */
export function CartBadgeLink() {
  const t = useT();
  const { count } = useCart();
  return (
    <Link href="/cart" className="icon-btn" aria-label={t("السلة")}>
      <Icon name="bag" />
      {count > 0 && <span className="badge-count">{count}</span>}
    </Link>
  );
}
