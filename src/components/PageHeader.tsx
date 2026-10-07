import Link from "next/link";
import { Icon } from "./Icon";

/** ترويسة الصفحات الفرعية: زر رجوع (يمين) + عنوان في الوسط + عنصر اختياري يسار */
export function PageHeader({ title, back = "/", end }: { title: string; back?: string; end?: React.ReactNode }) {
  return (
    <div className="topbar">
      <Link href={back} className="icon-btn" aria-label="رجوع"><Icon name="back" stroke={2} /></Link>
      <h1 className="h-title" style={{ textAlign: "center" }}>{title}</h1>
      {end ?? <span style={{ width: 48, height: 48 }} />}
    </div>
  );
}
