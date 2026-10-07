import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="page app" style={{ minHeight: "100dvh", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <img src="/icons/logo-mark.svg" alt="" style={{ height: 96, width: "auto" }} />
      <div className="title-block" style={{ alignItems: "center" }}>
        <h1 className="h-title">{t("الصفحة غير موجودة")}</h1>
        <p className="muted">{t("ربما نُقلت أو لم تعد متاحة")}</p>
      </div>
      <Link href="/" className="btn cta" style={{ padding: "0 32px" }}>{t("العودة للرئيسية")}</Link>
    </main>
  );
}
