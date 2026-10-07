import { FINANCE_ROLES, requireStaff } from "@/lib/admin";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { sb } = await requireStaff(FINANCE_ROLES);
  const { error } = await sb.from("finance_settings").select("id").limit(1);
  if (error) {
    return (
      <div className="acard" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
        <h1 className="adm-h1">المالية بحاجة لخطوة إعداد واحدة</h1>
        <p style={{ lineHeight: 1.8 }}>
          جداول المحاسبة غير موجودة في قاعدة البيانات بعد. افتحي Supabase ← SQL Editor، ثم انسخي محتوى الملفات التالية من المستودع ونفّذيها بالترتيب:
        </p>
        <ol style={{ lineHeight: 1.9, paddingInlineStart: 20 }}>
          <li className="ltr" style={{ textAlign: "right" }}>supabase/migrations/0004_role_guard.sql</li>
          <li className="ltr" style={{ textAlign: "right" }}>supabase/migrations/0005_finance.sql</li>
        </ol>
        <p className="caption">بعد التنفيذ حدّثي هذه الصفحة.</p>
      </div>
    );
  }
  return <>{children}</>;
}
