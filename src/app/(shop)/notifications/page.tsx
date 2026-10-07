import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/server";
import { date } from "@/lib/format";
import { MarkAllRead } from "./MarkAllRead";

export const metadata = { title: "الإشعارات" };

export default async function NotificationsPage() {
  const sb = await createClient();
  const { data: u } = await sb.auth.getUser();
  const { data } = await sb.from("notifications").select("id,kind,title,body,is_read,created_at").eq("user_id", u.user!.id).order("created_at", { ascending: false }).limit(50);
  const list = data ?? [];

  return (
    <main className="page tight">
      <PageHeader title="الإشعارات" end={list.some((n) => !n.is_read) ? <MarkAllRead /> : undefined} />
      {list.length === 0 && (
        <div className="empty">
          <span className="ring"><Icon name="bell" size={40} stroke={1.6} /></span>
          <div className="title-block"><span className="h-section">لا توجد إشعارات بعد</span><span className="muted">ستصلك هنا تحديثات طلباتك والعروض</span></div>
        </div>
      )}
      {list.map((n) => (
        <div key={n.id} style={{ padding: 14, borderRadius: 20, display: "flex", alignItems: "flex-start", gap: 12, border: "1px solid var(--light-blush)", background: n.is_read ? "#fff" : "var(--surface-selected)" }}>
          <span className="icon-tile" style={n.kind === "offer" ? { background: "var(--magenta)", color: "#fff" } : undefined}>
            <Icon name={n.kind === "offer" ? "tag" : n.kind === "new" ? "star" : "truck"} />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="row-between" style={{ gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{n.title}</span>
              <span className="caption" style={{ fontSize: 11, flexShrink: 0 }}>{date(n.created_at)}</span>
            </span>
            {n.body && <span style={{ fontSize: 13, lineHeight: 1.7, color: "var(--neutral-fg)" }}>{n.body}</span>}
          </span>
          {!n.is_read && <span style={{ width: 8, height: 8, flexShrink: 0, marginTop: 8, borderRadius: "50%", background: "var(--magenta)" }} />}
        </div>
      ))}
    </main>
  );
}
