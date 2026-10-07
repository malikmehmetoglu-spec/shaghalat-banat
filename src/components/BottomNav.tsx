"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useCart } from "./CartProvider";
import { useT } from "@/components/LangProvider";

const items = [
  { href: "/", label: "الرئيسية", icon: "home" as const, match: (p: string) => p === "/" },
  { href: "/categories", label: "الأقسام", icon: "grid" as const, match: (p: string) => p.startsWith("/categories") || p.startsWith("/c/") },
  { href: "/favorites", label: "المفضلة", icon: "heart" as const, match: (p: string) => p.startsWith("/favorites") },
  { href: "/cart", label: "السلة", icon: "bag" as const, match: (p: string) => p.startsWith("/cart") },
  { href: "/account", label: "حسابي", icon: "user" as const, match: (p: string) => p.startsWith("/account") || p.startsWith("/orders") },
];

export function BottomNav() {
  const t = useT();
  const path = usePathname();
  const { count } = useCart();
  return (
    <nav className="bottom-nav" aria-label={t("التنقل الرئيسي")}>
      {items.map((it) => {
        const on = it.match(path);
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : ""} aria-label={t(it.label)} aria-current={on ? "page" : undefined}>
            <Icon name={it.icon} size={22} stroke={on ? 2 : 1.8} />
            {it.icon === "bag" && count > 0 && <span className="badge-count">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
