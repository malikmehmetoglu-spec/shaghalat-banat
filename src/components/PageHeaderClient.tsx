"use client";
import Link from "next/link";
import { Icon } from "./Icon";
import { useT } from "@/components/LangProvider";

export function PageHeaderClient({ title, back = "/" }: { title: string; back?: string }) {
  const t = useT();
  return (
    <div className="topbar">
      <Link href={back} className="icon-btn" aria-label={t("رجوع")}><Icon name="back" stroke={2} /></Link>
      <h1 className="h-title" style={{ textAlign: "center" }}>{title}</h1>
      <Link href="/" className="ph-logo" aria-label={t("شغلات بنات")}><img src="/icons/logo-mark.svg" alt="" /></Link>
    </div>
  );
}
