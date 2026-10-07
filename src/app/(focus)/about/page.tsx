import Link from "next/link";
import { Icon } from "@/components/Icon";

export const metadata = { title: "من نحن" };

const TABS = [
  { key: "about", label: "من نحن" },
  { key: "contact", label: "تواصلي معنا" },
  { key: "policies", label: "السياسات" },
];

export default async function AboutPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "about" } = await searchParams;
  return (
    <main className="page tight" style={{ paddingBottom: 40 }}>
      <div className="topbar">
        <Link href="/account" className="icon-btn" aria-label="رجوع"><Icon name="back" stroke={2} /></Link>
        <h1 className="h-title">شغلات بنات</h1>
        <span style={{ width: 48 }} />
      </div>
      <div className="seg" role="tablist">
        {TABS.map((t) => (
          <Link key={t.key} href={`/about?tab=${t.key}`} role="tab" aria-selected={tab === t.key}
            style={{ flex: 1, height: 44, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, lineHeight: 1, fontWeight: tab === t.key ? 600 : 500, color: tab === t.key ? "var(--magenta)" : "var(--text-muted)", background: tab === t.key ? "#fff" : "transparent" }}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "about" && (
        <>
          <div style={{ height: 200, borderRadius: 28, background: "linear-gradient(135deg,var(--deep-berry),var(--magenta) 60%,var(--banat-pink))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/icons/logo-stacked.svg" alt="شغلات بنات" style={{ height: 150, width: "auto", filter: "brightness(0) invert(1)" }} />
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.9, color: "var(--neutral-fg)" }}>[نبذة عن المتجر: قصة البداية، ما يميّزكم، والقيم التي تلتزمون بها مع عميلاتكم.]</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
            {[["جودة", "منتجات مختارة"], ["خصوصية", "تغليف محايد"], ["سرعة", "توصيل لباب البيت"]].map(([t, d]) => (
              <div key={t} style={{ padding: "16px 8px", borderRadius: 20, background: "var(--light-blush)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: "var(--deep-berry)" }}>{t}</span>
                <span className="caption" style={{ fontSize: 11 }}>{d}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "contact" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[["chat", "واتساب", "[رقم الواتساب]"], ["chat", "اتصال مباشر", "[رقم الهاتف]"], ["star", "إنستغرام", "[@اسم الحساب]"]].map(([i, t, v]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 20, border: "1px solid var(--light-blush)" }}>
              <span className="icon-tile"><Icon name={i as "chat"} /></span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{t}</span><span className="caption" style={{ fontSize: 13 }}>{v}</span></span>
            </div>
          ))}
          <div className="soft-card" style={{ marginTop: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>محلّنا</span>
            <span style={{ fontSize: 14, lineHeight: 1.7, color: "var(--neutral-fg)" }}>[عنوان المحل بالتفصيل]</span>
            <div className="kv"><span className="muted">أوقات الدوام</span><span style={{ fontWeight: 600 }}>[من – إلى]</span></div>
          </div>
        </div>
      )}

      {tab === "policies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["سياسة الإرجاع والاستبدال", "الإرجاع أو الاستبدال خلال 7 أيام من الاستلام بحالة المنتج الأصلية. اللانجري والعطور المفتوحة غير قابلة للإرجاع حفاظاً على الصحة."],
            ["الشحن والتوصيل", "[مدة التوصيل، المناطق المشمولة، وتكاليف الشحن.]"],
            ["الخصوصية", "نغلّف كل الطلبات بشكل محايد دون ذكر محتواها، ولا نشارك بياناتك مع أي جهة."],
            ["الشروط والأحكام", "[نص الشروط والأحكام.]"],
          ].map(([t, d]) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16, borderRadius: 20, background: "var(--surface-selected)", border: "1px solid var(--light-blush)" }}>
              <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{t}</span>
              <span style={{ fontSize: 13, lineHeight: 1.8, color: "var(--neutral-fg)" }}>{d}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
