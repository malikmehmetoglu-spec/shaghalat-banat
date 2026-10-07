import Link from "next/link";

export const metadata = { title: "لا توجد صلاحية" };

export default function NoAccess() {
  return (
    <main className="page app" style={{ minHeight: "100dvh", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <img src="/icons/logo-mark.svg" alt="" style={{ height: 96, width: "auto" }} />
      <div className="title-block" style={{ alignItems: "center" }}>
        <h1 className="h-title">هذه الصفحة لفريق العمل</h1>
        <p className="muted">حسابك لا يملك صلاحية الدخول إلى لوحة الإدارة. اطلبي من المديرة إضافتك.</p>
      </div>
      <Link href="/" className="btn cta" style={{ padding: "0 32px" }}>العودة للمتجر</Link>
    </main>
  );
}
