"use client";
import Link from "next/link";
import { Icon } from "./Icon";

export function PageHeaderClient({ title, back = "/" }: { title: string; back?: string }) {
  return (
    <div className="topbar">
      <Link href={back} className="icon-btn" aria-label="رجوع"><Icon name="back" stroke={2} /></Link>
      <h1 className="h-title" style={{ textAlign: "center" }}>{title}</h1>
      <span style={{ width: 48, height: 48 }} />
    </div>
  );
}
