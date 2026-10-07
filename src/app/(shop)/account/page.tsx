import Link from "next/link";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";

export const metadata = { title: "حسابي" };

export default async function AccountPage() {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const uid = u.user!.id;
  const [{ data: profile }, { count: orders }, { count: favs }] = await Promise.all([
    sb.from("profiles").select("full_name,phone,email,points").eq("id", uid).maybeSingle(),
    sb.from("orders").select("id", { count: "exact", head: true }).eq("user_id", uid),
    sb.from("favorites").select("product_id", { count: "exact", head: true }).eq("user_id", uid),
  ]);
  const name = profile?.full_name || "أهلاً بكِ";
  const contact = profile?.phone || profile?.email || u.user?.email || "";

  const shop = [
    { href: "/orders", icon: "bag" as const, label: "طلباتي" },
    { href: "/account/addresses", icon: "pin" as const, label: "عناويني" },
    { href: "/notifications", icon: "bell" as const, label: "الإشعارات" },
  ];
  const more = [
    { href: "/about?tab=contact", icon: "chat" as const, label: "تواصلي معنا" },
    { href: "/about?tab=policies", icon: "shield" as const, label: "السياسات والخصوصية" },
  ];

  return (
    <main className="page tight">
      <h1 className="h-display">حسابي</h1>

      <div style={{ padding: 20, borderRadius: 28, background: "linear-gradient(135deg,var(--deep-berry),var(--magenta))", color: "#fff", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 64, height: 64, flexShrink: 0, borderRadius: "50%", background: "rgba(255,255,255,.22)", border: "2px solid rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{name[0]}</span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{name}</span>
            <span className="ltr" style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9, textAlign: "right" }}>{contact}</span>
          </div>
          <Link href="/account/profile" aria-label="تعديل الملف" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <Icon name="edit" size={18} stroke={2} />
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
          {[{ v: orders ?? 0, l: "طلب", h: "/orders" }, { v: favs ?? 0, l: "مفضلة", h: "/favorites" }, { v: profile?.points ?? 0, l: "نقطة", h: "/account" }].map((s) => (
            <Link key={s.l} href={s.h} style={{ padding: "12px 8px", borderRadius: 18, background: "rgba(255,255,255,.16)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>{s.v}</span>
              <span style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.9 }}>{s.l}</span>
            </Link>
          ))}
        </div>
      </div>

      {[{ title: "التسوّق", rows: shop }, { title: "المساعدة", rows: more }].map((g) => (
        <section key={g.title} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: "var(--text-muted)", padding: "0 4px" }}>{g.title}</span>
          <div className="list">
            {g.rows.map((r) => (
              <Link key={r.href} href={r.href} className="list-row">
                <span className="ib"><Icon name={r.icon} /></span>
                <span className="lbl">{r.label}</span>
                <span style={{ color: "#C9AAB4", display: "flex" }}><Icon name="forward" size={16} stroke={2} /></span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <LogoutButton />
    </main>
  );
}
