import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" style={{ minHeight: "100dvh", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <img src="/icons/logo-mark.svg" alt="" style={{ height: 96, width: "auto" }} />
      <div className="title-block" style={{ alignItems: "center" }}>
        <h1 className="h-title">الصفحة غير موجودة</h1>
        <p className="muted">ربما نُقلت أو لم تعد متاحة</p>
      </div>
      <Link href="/" className="btn cta" style={{ padding: "0 32px" }}>العودة للرئيسية</Link>
    </main>
  );
}
