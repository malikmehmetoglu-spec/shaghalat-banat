import { requireStaff, ROLE_LABEL } from "@/lib/admin";
import { date } from "@/lib/format";
import { FormCard } from "../FormCard";
import { createStaff } from "../actions";
import { MyPassword, StaffRow } from "./StaffControls";

export const metadata = { title: "الموظفون والأدوار" };

const ROLES = ["owner", "sales", "inventory", "accountant", "cashier"];
const MATRIX: [string, string[]][] = [
  ["لوحة المؤشرات", ["owner", "sales", "inventory", "accountant", "cashier"]],
  ["الطلبات والعملاء", ["owner", "sales"]],
  ["المنتجات والأقسام والكوبونات", ["owner", "sales"]],
  ["المخزون والجرد والمشتريات", ["owner", "inventory"]],
  ["نقطة البيع في المحل", ["owner", "sales", "cashier"]],
  ["المالية والمحاسبة", ["owner", "accountant"]],
  ["الموظفون والأدوار", ["owner"]],
];

export default async function StaffPage() {
  const { sb, profile } = await requireStaff();
  const { data } = await sb.rpc("staff_accounts");
  const isOwner = profile.role === "owner";
  const rows = (data ?? []) as { id: string; login: string; full_name: string | null; role: string; active: boolean; last_sign_in_at: string | null; created_at: string }[];

  return (
    <>
      <div className="adm-top"><div className="title-block"><h1 className="adm-h1">الموظفون والأدوار</h1><span className="adm-sub">حسابات الدخول إلى لوحة الإدارة — اسم مستخدم وكلمة مرور</span></div></div>
      <div className="split">
        <div className="acard flush wide">
          <div className="tw">
            <table className="tbl">
              <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>آخر دخول</th><th>الحالة</th>{isOwner && <th></th>}</tr></thead>
              <tbody>
                {rows.map((s) => (
                  <StaffRow key={s.id} isOwner={isOwner} isMe={s.id === profile.id}
                    s={{ ...s, login: s.login.replace(/@shaghalat-banat\.com$/, ""), last: s.last_sign_in_at ? date(s.last_sign_in_at, true) : "لم يدخل بعد" }}
                    roles={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="narrow" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isOwner ? (
            <FormCard title="حساب موظف جديد" action={createStaff} submitLabel="إنشاء الحساب">
              <label className="a-field">الاسم<input name="name" className="a-in" required placeholder="سارة" /></label>
              <label className="a-field">اسم المستخدم<input name="login" className="a-in ltr" required placeholder="sara" autoComplete="off" /></label>
              <label className="a-field">كلمة المرور<input name="password" type="text" className="a-in ltr" required minLength={6} autoComplete="new-password" /></label>
              <label className="a-field">الدور
                <select name="role" className="a-in" defaultValue="cashier">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
              </label>
              <span className="caption">يدخل الموظف من صفحة <span className="ltr">/admin-login</span> باسم المستخدم وكلمة المرور.</span>
            </FormCard>
          ) : <div className="acard caption">إنشاء الحسابات وتعديلها متاح للمدير العام فقط.</div>}
          <MyPassword />
        </div>
      </div>
      <div className="acard flush">
        <h2 className="adm-h2" style={{ padding: "12px 14px 4px" }}>صلاحيات الأدوار</h2>
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>القسم</th>{ROLES.map((r) => <th key={r} style={{ textAlign: "center" }}>{ROLE_LABEL[r]}</th>)}</tr></thead>
            <tbody>
              {MATRIX.map(([area, allowed]) => (
                <tr key={area}><td style={{ fontWeight: 500 }}>{area}</td>{ROLES.map((r) => <td key={r} style={{ textAlign: "center", color: allowed.includes(r) ? "var(--magenta)" : "var(--rosy-gray)", fontWeight: 700 }}>{allowed.includes(r) ? "✓" : "—"}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="caption" style={{ padding: "10px 14px 14px" }}>قسم المالية متاح للمدير العام والمحاسبة فقط، وقسم الموظفين للمدير العام فقط؛ باقي الأقسام متاحة لكل الفريق حالياً.</p>
      </div>
    </>
  );
}
